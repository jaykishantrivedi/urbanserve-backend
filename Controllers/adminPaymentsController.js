import { paymentModel } from "../models/paymentModel.js"
import { bookingModel } from "../models/bookingModel.js"

// ── GET ALL PAYMENTS (admin, paginated, searchable, filterable) ─────────
export const getAdminPayments = async (req, res) => {
    try {
        const {
            page   = 1,
            limit  = 10,
            search = "",
            status = "all",   // "all" | "pending" | "paid" | "failed" | "refunded"
            method = "all",   // "all" | "upi" | "card" | "netbanking" | "wallet" | "cash" | "razorpay" | "online"
        } = req.query

        const pageNum  = Math.max(1, parseInt(page))
        const limitNum = Math.min(100, Math.max(1, parseInt(limit)))

        const statusFilter = status !== "all" ? { paymentStatus: status } : {}
        const methodFilter = method !== "all" ? { paymentMethod: method } : {}

        const pipeline = [
            { $lookup: { from: "users",            localField: "user",     foreignField: "_id", as: "userDoc"     } },
            { $lookup: { from: "serviceproviders", localField: "provider", foreignField: "_id", as: "providerDoc" } },
            // Join booking details (optional, occasionally _id search mapping is helpful)
            { $lookup: { from: "bookings",         localField: "booking",  foreignField: "_id", as: "bookingDoc"  } },

            { $unwind: { path: "$userDoc",     preserveNullAndEmptyArrays: true } },
            { $unwind: { path: "$providerDoc", preserveNullAndEmptyArrays: true } },
            { $unwind: { path: "$bookingDoc",  preserveNullAndEmptyArrays: true } },

            { $match: statusFilter },
            { $match: methodFilter },

            ...(search.trim()
                ? [{
                    $match: {
                        $or: [
                            { "userDoc.name":             { $regex: search.trim(), $options: "i" } },
                            { "providerDoc.businessName": { $regex: search.trim(), $options: "i" } },
                            { "transactionId":            { $regex: search.trim(), $options: "i" } },
                            // If user types raw booking/payment hex id, we can't do string regex match on standard ObjectId fields cleanly
                            // without converting them, but string-based transactionIds or names will match fine.
                        ]
                    }
                }]
                : []),

            {
                $project: {
                    _id:            1,
                    bookingId:      "$bookingDoc._id",
                    user:           "$userDoc.name",
                    provider:       "$providerDoc.businessName",
                    amount:         1,
                    paymentMethod:  1,
                    paymentStatus:  1,
                    transactionId:  1,
                    createdAt:      1,
                    paidAt:         1,
                }
            },
            { $sort: { createdAt: -1 } },
        ]

        const dataPipeline  = [...pipeline, { $skip: (pageNum - 1) * limitNum }, { $limit: limitNum }]
        const countPipeline = [...pipeline, { $count: "total" }]

        const [payments, countResult, kpis] = await Promise.all([
            paymentModel.aggregate(dataPipeline),
            paymentModel.aggregate(countPipeline),
            paymentModel.aggregate([
                {
                    $group: {
                        _id: null,
                        totalPayments:   { $sum: 1 },
                        totalRevenue:    { $sum: { $cond: [{ $eq: ["$paymentStatus", "paid"] }, { $ifNull: ["$amount", 0] }, 0] } },
                        pendingPayments: { $sum: { $cond: [{ $eq: ["$paymentStatus", "pending"] }, 1, 0] } },
                        failedPayments:  { $sum: { $cond: [{ $eq: ["$paymentStatus", "failed"] }, 1, 0] } },
                    }
                }
            ])
        ])

        const total   = countResult[0]?.total || 0
        const kpiData = kpis[0] || {}

        return res.status(200).json({
            success: true,
            payments,
            pagination: {
                total,
                page:       pageNum,
                limit:      limitNum,
                totalPages: Math.ceil(total / limitNum) || 1,
            },
            kpis: {
                totalPayments:   kpiData.totalPayments   || 0,
                totalRevenue:    kpiData.totalRevenue    || 0,
                pendingPayments: kpiData.pendingPayments || 0,
                failedPayments:  kpiData.failedPayments  || 0,
            },
        })
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message })
    }
}

// ── ADMIN ADMIN REFUND/FAIL ACTIONS ───────────────────────────────────

export const adminRefundPayment = async (req, res) => {
    try {
        const { paymentId } = req.params

        const payment = await paymentModel.findById(paymentId)
        if (!payment) return res.status(404).json({ success: false, message: "Payment not found" })
        if (payment.paymentStatus !== "paid") return res.status(400).json({ success: false, message: "Can only refund 'paid' transactions" })

        payment.paymentStatus = "refunded"
        await payment.save()

        return res.status(200).json({ success: true, message: "Payment refunded" })
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message })
    }
}

export const adminFailPayment = async (req, res) => {
    try {
        const { paymentId } = req.params

        const payment = await paymentModel.findById(paymentId)
        if (!payment) return res.status(404).json({ success: false, message: "Payment not found" })
        if (payment.paymentStatus !== "pending") return res.status(400).json({ success: false, message: "Can only fail 'pending' transactions" })

        payment.paymentStatus = "failed"
        await payment.save()

        return res.status(200).json({ success: true, message: "Payment marked as failed" })
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message })
    }
}
