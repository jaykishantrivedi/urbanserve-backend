import { userModel } from "../models/userModel.js"
import { bookingModel } from "../models/bookingModel.js"

// ── GET ALL USERS (admin, paginated, searchable, filterable) ──────────
export const getAdminUsers = async (req, res) => {
    try {
        const {
            page     = 1,
            limit    = 10,
            search   = "",
            status   = "all",  // "all" | "active" | "blocked"
        } = req.query

        const pageNum  = Math.max(1, parseInt(page))
        const limitNum = Math.min(100, Math.max(1, parseInt(limit)))

        const filter = { role: "user", isDeleted: false }

        if (search.trim()) {
            filter.$or = [
                { name:  { $regex: search.trim(), $options: "i" } },
                { email: { $regex: search.trim(), $options: "i" } },
            ]
        }

        if (status === "active")  filter.isBlocked = false
        if (status === "blocked") filter.isBlocked = true

        const now           = new Date()
        const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        const lastMonthEnd   = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)

        const [users, total, totalAll, totalActive, totalBlocked, newThisMonth, newLastMonth] =
            await Promise.all([
                userModel
                    .find(filter)
                    .select("name email phone isBlocked createdAt city")
                    .sort({ createdAt: -1 })
                    .skip((pageNum - 1) * limitNum)
                    .limit(limitNum)
                    .lean(),

                userModel.countDocuments(filter),

                // KPI counts — always across ALL users (not filtered)
                userModel.countDocuments({ role: "user", isDeleted: false }),
                userModel.countDocuments({ role: "user", isDeleted: false, isBlocked: false }),
                userModel.countDocuments({ role: "user", isDeleted: false, isBlocked: true }),
                userModel.countDocuments({ role: "user", isDeleted: false, createdAt: { $gte: thisMonthStart } }),
                userModel.countDocuments({ role: "user", isDeleted: false, createdAt: { $gte: lastMonthStart, $lte: lastMonthEnd } }),
            ])

        // Attach booking count to each user in the page
        const userIds = users.map(u => u._id)
        const bookingCounts = await bookingModel.aggregate([
            { $match: { user: { $in: userIds } } },
            { $group: { _id: "$user", count: { $sum: 1 } } }
        ])
        const bookingMap = Object.fromEntries(bookingCounts.map(b => [b._id.toString(), b.count]))

        const enriched = users.map(u => ({
            ...u,
            status:   u.isBlocked ? "blocked" : "active",
            bookings: bookingMap[u._id.toString()] || 0,
        }))

        const newPct = newLastMonth === 0
            ? null
            : (((newThisMonth - newLastMonth) / newLastMonth) * 100).toFixed(1)

        return res.status(200).json({
            success: true,
            users: enriched,
            pagination: {
                total,
                page:       pageNum,
                limit:      limitNum,
                totalPages: Math.ceil(total / limitNum),
            },
            kpis: {
                totalUsers:    totalAll,
                activeUsers:   totalActive,
                blockedUsers:  totalBlocked,
                newThisMonth,
                newPctChange:  newPct,
            },
        })
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message })
    }
}

// ── GET SINGLE USER (admin view) ────────────────────────────────────────
export const getAdminUserById = async (req, res) => {
    try {
        const { userId } = req.params
        const user = await userModel
            .findById(userId)
            .select("name email phone city address pfpUrl role status isBlocked isVerified createdAt lastLogin")
            .lean()

        if (!user || user.isDeleted) {
            return res.status(404).json({ success: false, message: "User not found" })
        }

        const [total, completed, cancelled, inProgress] = await Promise.all([
            bookingModel.countDocuments({ user: userId }),
            bookingModel.countDocuments({ user: userId, status: "completed" }),
            bookingModel.countDocuments({ user: userId, status: "cancelled" }),
            bookingModel.countDocuments({ user: userId, status: { $in: ["open", "accepted"] } }),
        ])

        return res.status(200).json({
            success: true,
            user: {
                ...user,
                status: user.isBlocked ? "blocked" : "active",
            },
            bookingStats: { total, completed, cancelled, inProgress },
        })
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message })
    }
}

export const toggleUserBlock = async (req, res) => {
    try {
        const { userId } = req.params
        const user = await userModel.findById(userId)

        if (!user || user.isDeleted) {
            return res.status(404).json({ success: false, message: "User not found" })
        }
        if (user.role === "admin") {
            return res.status(403).json({ success: false, message: "Cannot block an admin account" })
        }

        user.isBlocked = !user.isBlocked
        await user.save()

        return res.status(200).json({
            success: true,
            message: user.isBlocked ? "User blocked successfully" : "User unblocked successfully",
            isBlocked: user.isBlocked,
        })
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message })
    }
}
