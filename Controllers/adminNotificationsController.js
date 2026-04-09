import { notificationModel } from "../models/notificationModel.js"
import mongoose from "mongoose"

// ── GET ALL NOTIFICATIONS (admin, paginated, searchable, filterable) ───
export const getAdminNotifications = async (req, res) => {
    try {
        const {
            page   = 1,
            limit  = 10,
            search = "",
            type   = "all",
            status = "all", // "all" | "read" | "unread"
        } = req.query

        const pageNum  = Math.max(1, parseInt(page))
        const limitNum = Math.min(100, Math.max(1, parseInt(limit)))

        const pipelineMatch = []
        
        // Reverse map UI type values to backend enums if necessary, since UI sends literal strings
        const typeMapping = {
            "Service Request":   "service_request",
            "Provider Response": "provider_response",
            "Booking Confirmed": "booking_confirmed",
            "Service Completed": "service_completed",
            "Payment Received":  "payment_received",
            "New Review":        "new_review"
        }
        
        if (type !== "all") {
            const mappedType = typeMapping[type] || type
            pipelineMatch.push({ $match: { type: mappedType } })
        }

        if (status !== "all") {
            pipelineMatch.push({ $match: { isRead: status === "read" } })
        }

        const pipeline = [
            ...pipelineMatch,

            // RefPath is recipientType ("user" or "provider").
            // We can do two left joins and coalesce them
            { $lookup: { from: "users",            localField: "recipient", foreignField: "_id", as: "userDoc" } },
            { $lookup: { from: "serviceproviders", localField: "recipient", foreignField: "_id", as: "providerDoc" } },
            
            { $unwind: { path: "$userDoc",     preserveNullAndEmptyArrays: true } },
            { $unwind: { path: "$providerDoc", preserveNullAndEmptyArrays: true } },

            ...(search.trim()
                ? [{
                    $match: {
                        $or: [
                            { title:                      { $regex: search.trim(), $options: "i" } },
                            { message:                    { $regex: search.trim(), $options: "i" } },
                            { "userDoc.name":             { $regex: search.trim(), $options: "i" } },
                            { "providerDoc.businessName": { $regex: search.trim(), $options: "i" } },
                        ]
                    }
                }]
                : []),

            {
                $project: {
                    _id:           1,
                    title:         1,
                    message:       1,
                    type:          1,
                    isRead:        1,
                    recipientType: { $ifNull: ["$recipientType", "user"] },
                    recipientName: {
                        $cond: [
                            { $eq: ["$recipientType", "provider"] },
                            "$providerDoc.businessName",
                            "$userDoc.name"
                        ]
                    },
                    date: "$createdAt"
                }
            },
            { $sort: { date: -1 } }
        ]

        const dataPipeline  = [...pipeline, { $skip: (pageNum - 1) * limitNum }, { $limit: limitNum }]
        const countPipeline = [...pipeline, { $count: "total" }]

        // KPI query across absolute collection (ignoring search queries but matching collection totals)
        const [notifications, countResult, globalStats] = await Promise.all([
            notificationModel.aggregate(dataPipeline),
            notificationModel.aggregate(countPipeline),
            notificationModel.aggregate([
                {
                    $group: {
                        _id: null,
                        totalNotifications:    { $sum: 1 },
                        unreadNotifications:   { $sum: { $cond: [{ $eq: ["$isRead", false] }, 1, 0] } },
                        userNotifications:     { $sum: { $cond: [{ $eq: ["$recipientType", "user"] }, 1, 0] } },
                        providerNotifications: { $sum: { $cond: [{ $eq: ["$recipientType", "provider"] }, 1, 0] } },
                    }
                }
            ])
        ])

        const total = countResult[0]?.total || 0
        const stats = globalStats[0] || {}

        // Map backend types to frontend readable format
        const reverseTypeMap = {
            "service_request":   "Service Request",
            "provider_response": "Provider Response",
            "booking_confirmed": "Booking Confirmed",
            "service_completed": "Service Completed",
            "payment_received":  "Payment Received",
            "new_review":        "New Review"
        }

        const formattedNotifications = notifications.map(n => ({
            id: n._id,
            title: n.title,
            message: n.message,
            type: reverseTypeMap[n.type] || n.type,
            status: n.isRead ? "read" : "unread",
            recipient: n.recipientName || "Unknown",
            recipientType: n.recipientType === "provider" ? "Provider" : "User",
            date: n.date
        }))

        return res.status(200).json({
            success: true,
            notifications: formattedNotifications,
            pagination: {
                total,
                page:       pageNum,
                limit:      limitNum,
                totalPages: Math.ceil(total / limitNum) || 1,
            },
            kpis: {
                totalNotifications:    stats.totalNotifications || 0,
                unreadNotifications:   stats.unreadNotifications || 0,
                userNotifications:     stats.userNotifications || 0,
                providerNotifications: stats.providerNotifications || 0,
            }
        })
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message })
    }
}

// ── TOGGLE NOTIFICATION STATUS (Read / Unread) ──────────────────────────
export const adminToggleNotificationStatus = async (req, res) => {
    try {
        const { notificationId } = req.params

        const notification = await notificationModel.findById(notificationId)
        if (!notification) return res.status(404).json({ success: false, message: "Notification not found" })

        notification.isRead = !notification.isRead
        await notification.save()

        return res.status(200).json({ 
            success: true, 
            message: `Notification marked as ${notification.isRead ? 'read' : 'unread'}` 
        })
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message })
    }
}

// ── DELETE NOTIFICATION (Admin only) ──────────────────────────────────
export const adminDeleteNotification = async (req, res) => {
    try {
        const { notificationId } = req.params

        const notification = await notificationModel.findById(notificationId)
        if (!notification) return res.status(404).json({ success: false, message: "Notification not found" })

        await notificationModel.findByIdAndDelete(notificationId)

        return res.status(200).json({ success: true, message: "Notification deleted successfully" })
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message })
    }
}
