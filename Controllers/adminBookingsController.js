import { bookingModel } from "../models/bookingModel.js"

// ── GET ALL BOOKINGS (admin, paginated, searchable, filterable) ─────────
export const getAdminBookings = async (req, res) => {
    try {
        const {
            page   = 1,
            limit  = 10,
            search = "",
            status = "all",   // "all" | "open" | "accepted" | "closed" | "completed" | "cancelled"
        } = req.query

        const pageNum  = Math.max(1, parseInt(page))
        const limitNum = Math.min(100, Math.max(1, parseInt(limit)))

        const filter = {}
        if (status !== "all") filter.status = status

        // Text search — match against populated fields via aggregation
        // For simple approach: search on bookingId (_id hex substring match done client-side isn't great,
        // so we'll do it in aggregation with $lookup)
        const pipeline = [
            { $lookup: { from: "users",            localField: "user",     foreignField: "_id", as: "userDoc"     } },
            { $lookup: { from: "serviceproviders", localField: "provider", foreignField: "_id", as: "providerDoc" } },
            { $lookup: { from: "services",         localField: "service",  foreignField: "_id", as: "serviceDoc"  } },
            { $unwind: { path: "$userDoc",     preserveNullAndEmptyArrays: true } },
            { $unwind: { path: "$providerDoc", preserveNullAndEmptyArrays: true } },
            { $unwind: { path: "$serviceDoc",  preserveNullAndEmptyArrays: true } },

            ...(status !== "all" ? [{ $match: { status } }] : []),

            ...(search.trim()
                ? [{
                    $match: {
                        $or: [
                            { "userDoc.name":           { $regex: search.trim(), $options: "i" } },
                            { "providerDoc.businessName": { $regex: search.trim(), $options: "i" } },
                            { "serviceDoc.serviceName": { $regex: search.trim(), $options: "i" } },
                        ]
                    }
                }]
                : []),

            {
                $project: {
                    _id:         1,
                    status:      1,
                    serviceDate: 1,
                    serviceTime: 1,
                    price:       1,
                    finalPrice:  1,
                    priceType:   1,
                    isPaid:      1,
                    location:    1,
                    cancelledBy: 1,
                    createdAt:   1,
                    "user._id":  "$userDoc._id",
                    "user.name": "$userDoc.name",
                    "user.email": "$userDoc.email",
                    "provider._id":          "$providerDoc._id",
                    "provider.businessName": "$providerDoc.businessName",
                    "service._id":           "$serviceDoc._id",
                    "service.serviceName":   "$serviceDoc.serviceName",
                }
            },
            { $sort: { createdAt: -1 } },
        ]

        const countPipeline = [...pipeline, { $count: "total" }]

        const dataPipeline = [...pipeline, { $skip: (pageNum - 1) * limitNum }, { $limit: limitNum }]

        const [bookings, countResult, kpis] = await Promise.all([
            bookingModel.aggregate(dataPipeline),
            bookingModel.aggregate(countPipeline),
            bookingModel.aggregate([
                {
                    $group: {
                        _id:               null,
                        totalBookings:     { $sum: 1 },
                        openBookings:      { $sum: { $cond: [{ $eq: ["$status", "open"]      }, 1, 0] } },
                        acceptedBookings:  { $sum: { $cond: [{ $eq: ["$status", "accepted"]  }, 1, 0] } },
                        completedBookings: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } },
                        closedBookings:    { $sum: { $cond: [{ $eq: ["$status", "closed"]    }, 1, 0] } },
                        cancelledBookings: { $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] } },
                        totalRevenue:      { $sum: { $ifNull: ["$finalPrice", { $ifNull: ["$price", 0] }] } },
                    }
                }
            ])
        ])

        const total    = countResult[0]?.total || 0
        const kpiData  = kpis[0] || {}

        return res.status(200).json({
            success: true,
            bookings,
            pagination: {
                total,
                page:       pageNum,
                limit:      limitNum,
                totalPages: Math.ceil(total / limitNum) || 1,
            },
            kpis: {
                totalBookings:     kpiData.totalBookings     || 0,
                openBookings:      kpiData.openBookings      || 0,
                acceptedBookings:  kpiData.acceptedBookings  || 0,
                completedBookings: kpiData.completedBookings || 0,
                closedBookings:    kpiData.closedBookings    || 0,
                cancelledBookings: kpiData.cancelledBookings || 0,
                totalRevenue:      kpiData.totalRevenue      || 0,
            },
        })
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message })
    }
}

// ── GET SINGLE BOOKING (admin) ────────────────────────────────────────
export const getAdminBookingById = async (req, res) => {
    try {
        const { bookingId } = req.params
        const booking = await bookingModel
            .findById(bookingId)
            .populate("user",     "name email phone")
            .populate("provider", "businessName email phone adminStatus")
            .populate("service",  "serviceName slug")
            .populate("serviceRequest", "message address preferredDate preferredTime")
            .lean()

        if (!booking) {
            return res.status(404).json({ success: false, message: "Booking not found" })
        }

        return res.status(200).json({ success: true, booking })
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message })
    }
}

// ── ADMIN CANCEL BOOKING ───────────────────────────────────────────────
export const adminCancelBooking = async (req, res) => {
    try {
        const { bookingId } = req.params

        const booking = await bookingModel.findById(bookingId)
        if (!booking)         return res.status(404).json({ success: false, message: "Booking not found" })
        if (booking.status === "cancelled") return res.status(400).json({ success: false, message: "Already cancelled" })
        if (booking.status === "completed") return res.status(400).json({ success: false, message: "Completed booking cannot be cancelled" })
        if (booking.status === "closed")    return res.status(400).json({ success: false, message: "Closed booking cannot be cancelled" })

        booking.status      = "cancelled"
        booking.cancelledBy = null    // admin cancel — no nullable user/provider enum value, use null
        await booking.save()

        return res.status(200).json({ success: true, message: "Booking cancelled by admin" })
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message })
    }
}

// ── ADMIN MARK COMPLETED ───────────────────────────────────────────────
export const adminMarkCompleted = async (req, res) => {
    try {
        const { bookingId } = req.params

        const booking = await bookingModel.findById(bookingId)
        if (!booking)                        return res.status(404).json({ success: false, message: "Booking not found" })
        if (booking.status !== "accepted")   return res.status(400).json({ success: false, message: "Only accepted bookings can be marked completed" })

        booking.status = "completed"
        await booking.save()

        return res.status(200).json({ success: true, message: "Booking marked as completed" })
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message })
    }
}
