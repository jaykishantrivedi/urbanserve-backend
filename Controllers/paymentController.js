import crypto from "crypto"
import Razorpay from "razorpay"
import mongoose from "mongoose"
import { bookingModel } from "../models/bookingModel.js"
import { paymentModel } from "../models/paymentModel.js"
import { serviceProviderModel } from "../models/serviceProviderModel.js"
import { adminSettingModel } from "../models/adminSettingModel.js"
import { sendNotification } from "../utils/sendNotification.js"

const getRazorpay = () => new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_SECRET
})

const computeSplit = async (amount) => {
    const settings = await adminSettingModel.findOne()
    const commissionPct = settings ? settings.platformCommission : 10
    const adminAmount = Math.round((amount * commissionPct) / 100)
    const providerAmount = amount - adminAmount
    return { commissionPct, adminAmount, providerAmount }
}

// CREATE RAZORPAY ORDER (online payment)
export const createPaymentOrder = async (req, res) => {
    try {
        const userId = req.user.userId
        const { bookingId } = req.params

        if (!mongoose.Types.ObjectId.isValid(bookingId)) {
            return res.status(400).json({ success: false, message: "Invalid booking ID" })
        }

        const booking = await bookingModel.findOne({ user: userId, _id: bookingId })
        if (!booking) return res.status(404).json({ success: false, message: "Booking not found" })
        if (booking.status !== "closed") return res.status(400).json({ success: false, message: "Payment allowed only after service completion" })
        if (booking.isPaid) return res.status(400).json({ success: false, message: "Booking already paid" })

        const existing = await paymentModel.findOne({ booking: bookingId })
        if (existing && existing.paymentStatus === "paid") {
            return res.status(400).json({ success: false, message: "Payment already completed" })
        }

        const amount = booking.finalPrice || booking.price || 0
        if (!amount) return res.status(400).json({ success: false, message: "Booking amount not set" })

        const razorpay = getRazorpay()
        const order = await razorpay.orders.create({
            amount: Math.round(amount * 100), // paise
            currency: "INR",
            receipt: `booking_${bookingId}`,
            notes: { bookingId: bookingId.toString(), userId: userId.toString() }
        })

        const { commissionPct, adminAmount, providerAmount } = await computeSplit(amount)

        let payment = existing
        if (!payment) {
            payment = await paymentModel.create({
                booking: bookingId,
                user: userId,
                provider: booking.provider,
                amount,
                paymentMethod: "razorpay",
                gateway: "razorpay",
                gatewayOrderId: order.id,
                platformCommissionPct: commissionPct,
                adminAmount,
                providerAmount
            })
        } else {
            payment.gatewayOrderId = order.id
            payment.amount = amount
            payment.platformCommissionPct = commissionPct
            payment.adminAmount = adminAmount
            payment.providerAmount = providerAmount
            await payment.save()
        }

        return res.status(200).json({
            success: true,
            order,
            payment: { _id: payment._id, amount, commissionPct, adminAmount, providerAmount },
            razorpayKey: process.env.RAZORPAY_KEY_ID
        })
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message })
    }
}

// VERIFY RAZORPAY PAYMENT + mark booking completed
export const verifyRazorpayPayment = async (req, res) => {
    try {
        const userId = req.user.userId
        const { bookingId } = req.params
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return res.status(400).json({ success: false, message: "Missing Razorpay response fields" })
        }

        const expectedSig = crypto
            .createHmac("sha256", process.env.RAZORPAY_SECRET)
            .update(`${razorpay_order_id}|${razorpay_payment_id}`)
            .digest("hex")

        if (expectedSig !== razorpay_signature) {
            return res.status(400).json({ success: false, message: "Payment verification failed - invalid signature" })
        }

        const booking = await bookingModel.findOne({ _id: bookingId, user: userId })
        if (!booking) return res.status(404).json({ success: false, message: "Booking not found" })

        const payment = await paymentModel.findOne({ booking: bookingId })
            .populate("user", "name")
            .populate("provider", "_id businessName")
        if (!payment) return res.status(404).json({ success: false, message: "Payment record not found" })

        payment.paymentStatus = "paid"
        payment.transactionId = razorpay_payment_id
        payment.gatewayOrderId = razorpay_order_id
        payment.razorpaySignature = razorpay_signature
        payment.paidAt = new Date()
        await payment.save()

        booking.status = "completed"
        booking.isPaid = true
        await booking.save()

        await sendNotification(
            "provider",
            booking.provider,
            "Payment received",
            `${payment.user?.name || "Customer"} has paid ₹${payment.amount} for the service. Your share: ₹${payment.providerAmount}.`,
            "payment_received"
        )

        return res.status(200).json({
            success: true,
            message: "Payment verified and booking completed",
            payment
        })
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message })
    }
}

// CASH PAYMENT — immediately mark as paid & complete
export const createCashPayment = async (req, res) => {
    try {
        const userId = req.user.userId
        const { bookingId } = req.params

        if (!mongoose.Types.ObjectId.isValid(bookingId)) {
            return res.status(400).json({ success: false, message: "Invalid booking ID" })
        }

        const booking = await bookingModel
            .findOne({ user: userId, _id: bookingId })
            .populate("provider", "_id businessName")
            .populate("user", "name")
        if (!booking) return res.status(404).json({ success: false, message: "Booking not found" })
        if (booking.status !== "closed") return res.status(400).json({ success: false, message: "Service must be completed first" })
        if (booking.isPaid) return res.status(400).json({ success: false, message: "Already paid" })

        const existing = await paymentModel.findOne({ booking: bookingId, paymentStatus: "paid" })
        if (existing) return res.status(400).json({ success: false, message: "Payment already completed" })

        const amount = booking.finalPrice || booking.price || 0

        const settings = await adminSettingModel.findOne()
        const maxCashAllowed = settings?.maximumCashLimit || 5000
        
        if (amount > maxCashAllowed) {
            return res.status(400).json({ 
                success: false, 
                message: `Cash payments are not allowed for amounts exceeding ₹${maxCashAllowed}. Please use online payment.` 
            })
        }

        const { commissionPct, adminAmount, providerAmount } = await computeSplit(amount)


        const payment = await paymentModel.create({
            booking: bookingId,
            user: userId,
            provider: booking.provider._id,
            amount,
            paymentMethod: "cash",
            gateway: "cash",
            paymentStatus: "paid",
            paidAt: new Date(),
            platformCommissionPct: commissionPct,
            adminAmount,
            providerAmount
        })

        booking.status = "completed"
        booking.isPaid = true
        await booking.save()

        await sendNotification(
            "provider",
            booking.provider._id,
            "Cash payment confirmed",
            `Cash payment of ₹${amount} received from ${booking.user?.name}. Your share: ₹${providerAmount}.`,
            "payment_received"
        )

        return res.status(201).json({
            success: true,
            message: "Cash payment recorded. Booking completed.",
            payment
        })
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message })
    }
}

export const getUserPayments = async (req, res) => {
    try {
        const userId = req.user.userId
        const allPayments = await paymentModel
            .find({ user: userId })
            .populate("provider", "businessName")
            .populate({
                path: "booking",
                populate: [
                    { path: "service", select: "serviceName" },
                    { path: "provider", select: "businessName" }
                ],
                select: "service provider location serviceDate serviceTime price finalPrice priceType"
            })
            .sort({ createdAt: -1 })

        return res.status(200).json({ success: true, count: allPayments.length, allPayments })
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message })
    }
}

export const getProviderPayments = async (req, res) => {
    try {
        const userId = req.user.userId
        const provider = await serviceProviderModel.findOne({ user: userId, isDeleted: false })
        if (!provider) return res.status(404).json({ success: false, message: "Provider not found" })

        const allPayments = await paymentModel
            .find({ provider: provider._id })
            .populate("user", "name")
            .populate({
                path: "booking",
                populate: [
                    { path: "service", select: "serviceName" },
                    { path: "provider", select: "businessName" }
                ],
                select: "service provider location serviceDate serviceTime price finalPrice priceType"
            })
            .sort({ createdAt: -1 })

        return res.status(200).json({ success: true, count: allPayments.length, allPayments })
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message })
    }
}

export const getPaymentById = async (req, res) => {
    try {
        const userId = req.user.userId
        const { paymentId } = req.params

        if (!mongoose.Types.ObjectId.isValid(paymentId)) {
            return res.status(400).json({ success: false, message: "Invalid Payment Id" })
        }

        const payment = await paymentModel
            .findOne({ _id: paymentId })
            .populate("user", "name email")
            .populate("provider", "businessName")
            .populate({ path: "booking", populate: [{ path: "service", select: "serviceName" }, { path: "provider", select: "businessName" }] })
            .lean()

        if (!payment) return res.status(404).json({ success: false, message: "Payment not found" })

        // Only accessible by the user or provider of the booking
        const isUser = payment.user._id.toString() === userId.toString()
        const providerDoc = await serviceProviderModel.findOne({ user: userId }).select("_id").lean()
        const isProvider = providerDoc && payment.provider._id.toString() === providerDoc._id.toString()
        if (!isUser && !isProvider) return res.status(403).json({ success: false, message: "Not authorized" })

        return res.status(200).json({ success: true, payment })
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message })
    }
}