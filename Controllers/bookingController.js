import mongoose from "mongoose"
import bcrypt from "bcryptjs"
import { bookingModel } from "../models/bookingModel.js"
import { serviceProviderModel } from "../models/serviceProviderModel.js"

export const getUserBookings = async (req, res) => {
    try {
        const user = req.user.userId
        
        const bookings = await bookingModel
            .find({user})
            .populate("provider", "businessName")
            .populate("service", "serviceName slug")
            .sort({createdAt: -1})
            .lean()

        return res.status(200).json({
            success: true,
            count: bookings.length,
            bookings
        })
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        })
    }
}

export const getProviderBookings = async (req, res) => {
    try {
        const user = req.user.userId

        const provider = await serviceProviderModel.findOne({user}).select("_id").lean()
        if(!provider){
            return res.status(404).json({
                success: false,
                message: "Provider not found"
            })
        }

        const bookings = await bookingModel
            .find({provider: provider._id})
            .populate("user", "name email")
            .populate("service", "serviceName slug")
            .sort({createdAt: -1})
            .lean()

        return res.status(200).json({
            success: true, 
            count: bookings.length,
            bookings
        })

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        })
    }
}

export const getSingleBooking = async (req, res) => {
    try {
        const user = req.user.userId
        const {bookingId} = req.params

        const provider = await serviceProviderModel.findOne({user})

        const conditions = [{user}]
        
        if(provider){
            conditions.push({provider: provider._id})
        }

        const booking = await bookingModel
            .findOne({_id: bookingId, $or: conditions})
            .populate("service", "serviceName slug")
            .populate("provider", "businessName")
            .populate("user", "name email")
            .lean()
        
        if(!booking){
            return res.status(404).json({
                success: false,
                message: "Booking not found"
            })
        }

        return res.status(200).json({
            success: true,
            booking
        })
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        })    
    }
}

export const cancelBooking = async (req, res) => {
    try {
        const userId = req.user.userId
        const {bookingId} = req.params

        const provider = await serviceProviderModel
            .findOne({user: userId})
            .select("_id")
            .lean()

        const conditions = [{user: userId}]

        if(provider){
            conditions.push({provider: provider._id})
        }

        const booking = await bookingModel
            .findOne({
                _id: bookingId,
                $or: conditions
            })

        if(!booking){
            return res.status(404).json({
                success: false,
                message: "Booking not found"
            })
        }

        if(booking.status === "cancelled"){
            return res.status(400).json({
                success: false,
                message: "Booking already cancelled"
            })
        }

        if(booking.status === "closed"){
            return res.status(400).json({
                success: false,
                message: "Completed booking cannot be cancelled"
            })
        }

        booking.status = "cancelled"
        booking.cancelledBy = provider ? "provider" : "user"

        await booking.save()

         return res.status(200).json({
            success: true,
            message: "Booking cancelled successfully"
        })

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        })
    }
}

export const updateBookingStatus = async (req, res) => {
    try {
        const userId = req.user.userId
        const {bookingId} = req.params
        const {status} = req.body

        const provider = await serviceProviderModel
            .findOne({user: userId})
            .select("_id")
            .lean()

        if(!provider){
            return res.status(404).json({
                success: false,
                message: "Provider not found"
            })
        }

        const booking = await bookingModel.findOne({_id: bookingId, provider: provider._id})
        if(!booking){
            return res.status(404).json({
                success: false,
                message: "Booking not found"
            })
        }

        if(booking.status === "cancelled"){
            return res.status(400).json({
                success: false,
                message: "Cancelled booking cannot be cancelled"
            })
        }

        const allowedStatus = ["accepted", "closed"]

        if(!allowedStatus.includes(status)){
            return res.status(400).json({
                success: false,
                message: "Invalid status"
            })
        }

        booking.status = status

        await booking.save()

        return res.status(200).json({
            success: true,
            message: "Booking status updated",
            booking
        })

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        })
    }
}

export const setHoursWorked = async (req, res) => {
    try {
        const userId = req.user.userId
        const {bookingId} = req.params
        const {hoursWorked} = req.body

        if(!mongoose.Types.ObjectId.isValid(bookingId)){
            return res.status(400).json({
                success: false,
                message: "Invalid booking Id"
            })
        }

        const provider = await serviceProviderModel.findOne({user: userId}).select("_id").lean()

        const booking = await bookingModel.findOne({provider: provider._id, _id: bookingId})
        if(!booking){
            return res.status(404).json({
                success: false,
                message: "Booking not found"
            })
        }

        if(booking.status !== "accepted"){
            return res.status(400).json({
                success: false,
                message: "Hours can only be set while service is in-progress"
            })
        }

        if(booking.priceType !== "hourly"){
            return res.status(400).json({
                success: false,
                message: "This booking is not hourly type"
            })
        }

        if (hoursWorked <= 0) {
            return res.status(400).json({
                success: false,
                message: "Hours worked must be greater than 0"
            })
        }

        if(booking.finalPrice){
            return res.status(400).json({
                success: false,
                message: "Final price already set"
            })
        }

        booking.hoursWorked = hoursWorked
        booking.finalPrice = Math.round(hoursWorked * booking.price)

        await booking.save()

        return res.status(200).json({
            success: true, 
            message: "Hours worked set successfully"
        })

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        })
    }
}

export const setInspectionPrice = async (req, res) => {
    try {
        const userId = req.user.userId
        const {bookingId} = req.params
        const {finalPrice} = req.body

        if(!mongoose.Types.ObjectId.isValid(bookingId)){
            return res.status(400).json({
                success: false,
                message: "Invalid booking Id"
            })
        }

        const provider = await serviceProviderModel.findOne({user: userId}).select("_id").lean()

        const booking = await bookingModel.findOne({provider: provider._id, _id: bookingId})
        if(!booking){
            return res.status(404).json({
                success: false,
                message: "Booking not found"
            })
        }

        if(booking.status !== "accepted"){
            return res.status(400).json({
                success: false,
                message: "Final Price can only be set while service is in-progress"
            })
        }

        if(booking.priceType !== "inspection"){
            return res.status(400).json({
                success: false,
                message: "This booking is not inspection type"
            })
        }

        if (finalPrice <= 0) {
             return res.status(400).json({
                success: false,
                message: "Final price must be greater than 0"
            })
        }

        if(booking.finalPrice){
            return res.status(400).json({
                success: false,
                message: "Final price already set"
            })
        }

        booking.finalPrice = finalPrice

        await booking.save()

        return res.status(200).json({
            success: true,
            message: "Final price set successfully"
        })
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        })
    }
}

export const verifyStartOTP = async (req, res) => {
    try {
        const userId = req.user.userId
        const { bookingId } = req.params
        const { otp } = req.body

        if (!otp) {
            return res.status(400).json({ success: false, message: "OTP is required" })
        }

        const provider = await serviceProviderModel.findOne({ user: userId }).select("_id").lean()
        if (!provider) {
            return res.status(404).json({ success: false, message: "Provider not found" })
        }

        const booking = await bookingModel.findOne({ _id: bookingId, provider: provider._id })
        if (!booking) {
            return res.status(404).json({ success: false, message: "Booking not found" })
        }

        if (booking.status !== "open") {
            return res.status(400).json({ success: false, message: "Booking is not in open state" })
        }

        if (booking.otpValidUntil && new Date() > new Date(booking.otpValidUntil)) {
            return res.status(400).json({ success: false, message: "OTP has expired" })
        }

        const isValidOTP = await bcrypt.compare(otp.toString().trim(), booking.startOTP)
        if (!isValidOTP) {
            return res.status(400).json({ success: false, message: "Invalid OTP" })
        }

        booking.status = "accepted"
        await booking.save()

        return res.status(200).json({ success: true, message: "Service started successfully" })
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message })
    }
}

// Provider generates completion OTP after service is done
export const generateCompletionOTP = async (req, res) => {
    try {
        const userId = req.user.userId
        const { bookingId } = req.params

        const provider = await serviceProviderModel.findOne({ user: userId }).select("_id businessName").lean()
        if (!provider) {
            return res.status(404).json({ success: false, message: "Provider not found" })
        }

        const booking = await bookingModel.findOne({ _id: bookingId, provider: provider._id })
        if (!booking) {
            return res.status(404).json({ success: false, message: "Booking not found" })
        }

        if (booking.status !== "accepted") {
            return res.status(400).json({ success: false, message: "Booking must be in-progress to generate completion OTP" })
        }

        // For inspection/hourly: final price must be set before OTP
        if (booking.priceType === "inspection" && !booking.finalPrice) {
            return res.status(400).json({ success: false, message: "Please set the inspection price before generating the completion OTP" })
        }
        if (booking.priceType === "hourly" && !booking.hoursWorked) {
            return res.status(400).json({ success: false, message: "Please set hours worked before generating the completion OTP" })
        }

        const { sendNotification } = await import("../utils/sendNotification.js")

        const plainOTP = Math.floor(100000 + Math.random() * 900000).toString()
        const hashedOTP = await bcrypt.hash(plainOTP, 10)
        const completionOTPValidUntil = new Date()
        completionOTPValidUntil.setHours(completionOTPValidUntil.getHours() + 48)

        booking.completionOTP = hashedOTP
        booking.completionOTPValidUntil = completionOTPValidUntil
        await booking.save()

        await sendNotification(
            "user",
            booking.user,
            "Service Completed - Enter OTP to confirm",
            `Your provider ${provider.businessName} has completed the service. Ask them for the completion OTP to confirm and proceed to payment.`,
            "service_completed"
        )

        return res.status(200).json({
            success: true,
            message: "Completion OTP generated",
            completionOTP: plainOTP  // Return plain OTP for provider to show customer
        })
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message })
    }
}

// User enters completion OTP → booking status = "closed" (ready for payment)
export const verifyCompletionOTP = async (req, res) => {
    try {
        const userId = req.user.userId
        const { bookingId } = req.params
        const { otp } = req.body

        if (!otp) {
            return res.status(400).json({ success: false, message: "OTP is required" })
        }

        const booking = await bookingModel.findOne({ _id: bookingId, user: userId })
        if (!booking) {
            return res.status(404).json({ success: false, message: "Booking not found" })
        }

        if (booking.status !== "accepted") {
            return res.status(400).json({ success: false, message: "Booking is not in-progress" })
        }

        if (!booking.completionOTP) {
            return res.status(400).json({ success: false, message: "Provider has not generated the completion OTP yet" })
        }

        if (booking.completionOTPValidUntil && new Date() > new Date(booking.completionOTPValidUntil)) {
            return res.status(400).json({ success: false, message: "OTP has expired" })
        }

        const isMatch = await bcrypt.compare(otp.toString().trim(), booking.completionOTP)
        if (!isMatch) {
            return res.status(400).json({ success: false, message: "Invalid OTP" })
        }

        booking.status = "closed"
        await booking.save()

        return res.status(200).json({ success: true, message: "Service confirmed. Proceed to payment." })
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message })
    }
}