import { userModel } from "../models/userModel.js"
import { serviceProviderModel } from "../models/serviceProviderModel.js"
import { bookingModel } from "../models/bookingModel.js"
import { paymentModel } from "../models/paymentModel.js"
import { serviceModel } from "../models/serviceModel.js"
import { serviceCategoryModel } from "../models/serviceCategoryModel.js"

// ── Helpers ──────────────────────────────────────────────────────────
const startOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1)
const endOfMonth   = (date) => new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999)

// ── GET DASHBOARD KPIs ────────────────────────────────────────────────
export const getDashboardKPIs = async (req, res) => {
    try {
        const now = new Date()
        const thisMonthStart = startOfMonth(now)
        const lastMonthStart = startOfMonth(new Date(now.getFullYear(), now.getMonth() - 1, 1))
        const lastMonthEnd   = endOfMonth(new Date(now.getFullYear(), now.getMonth() - 1, 1))

        const [
            totalUsers,
            usersLastMonth,
            usersThisMonth,
            activeProviders,
            pendingProviders,
            blockedProviders,
            totalBookings,
            bookingsLastMonth,
            bookingsThisMonth,
            revenueAgg,
            revenueLastMonthAgg,
            revenueThisMonthAgg,
        ] = await Promise.all([
            userModel.countDocuments({ role: "user", isDeleted: false }),
            userModel.countDocuments({ role: "user", isDeleted: false, createdAt: { $gte: lastMonthStart, $lte: lastMonthEnd } }),
            userModel.countDocuments({ role: "user", isDeleted: false, createdAt: { $gte: thisMonthStart } }),

            serviceProviderModel.countDocuments({ isApproved: true, isDeleted: false, isBlocked: false }),
            serviceProviderModel.countDocuments({ isApproved: false, isDeleted: false, isBlocked: false }),
            serviceProviderModel.countDocuments({ isBlocked: true, isDeleted: false }),

            bookingModel.countDocuments({ isDeleted: { $ne: true } }),
            bookingModel.countDocuments({ createdAt: { $gte: lastMonthStart, $lte: lastMonthEnd } }),
            bookingModel.countDocuments({ createdAt: { $gte: thisMonthStart } }),

            paymentModel.aggregate([
                { $match: { paymentStatus: "paid" } },
                { $group: { _id: null, total: { $sum: "$amount" }, adminEarnings: { $sum: "$adminAmount" } } }
            ]),
            paymentModel.aggregate([
                { $match: { paymentStatus: "paid", paidAt: { $gte: lastMonthStart, $lte: lastMonthEnd } } },
                { $group: { _id: null, total: { $sum: "$amount" } } }
            ]),
            paymentModel.aggregate([
                { $match: { paymentStatus: "paid", paidAt: { $gte: thisMonthStart } } },
                { $group: { _id: null, total: { $sum: "$amount" } } }
            ]),
        ])

        const totalRevenue       = revenueAgg[0]?.total || 0
        const adminEarnings      = revenueAgg[0]?.adminEarnings || 0
        const revenueLastMonth   = revenueLastMonthAgg[0]?.total || 0
        const revenueThisMonth   = revenueThisMonthAgg[0]?.total || 0

        const pct = (curr, prev) => prev === 0 ? null : (((curr - prev) / prev) * 100).toFixed(1)

        return res.status(200).json({
            success: true,
            kpis: {
                totalUsers,
                usersThisMonth,
                usersPctChange: pct(usersThisMonth, usersLastMonth),

                activeProviders,
                pendingProviders,
                blockedProviders,

                totalBookings,
                bookingsThisMonth,
                bookingsLastMonth,
                bookingsPctChange: pct(bookingsThisMonth, bookingsLastMonth),

                totalRevenue,
                adminEarnings,
                revenueThisMonth,
                revenueLastMonth,
                revenuePctChange: pct(revenueThisMonth, revenueLastMonth),
            }
        })
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message })
    }
}

// ── GET BOOKING TRENDS ────────────────────────────────────────────────
// variant: "currentMonth" | "last7days" | "last12months"
export const getBookingTrends = async (req, res) => {
    try {
        const { variant = "currentMonth" } = req.query
        const now = new Date()
        let pipeline = []

        if (variant === "currentMonth") {
            const start = startOfMonth(now)
            pipeline = [
                { $match: { createdAt: { $gte: start } } },
                {
                    $group: {
                        _id: { $dayOfMonth: "$createdAt" },
                        bookings: { $sum: 1 }
                    }
                },
                { $sort: { "_id": 1 } },
                {
                    $project: {
                        _id: 0,
                        date: { $concat: [{ $toString: "$_id" }, " ", { $toString: { $month: now } }] },
                        label: { $toString: "$_id" },
                        bookings: 1
                    }
                }
            ]
            const raw = await bookingModel.aggregate(pipeline)
            const days = now.getDate()
            const map = Object.fromEntries(raw.map(r => [parseInt(r.label), r.bookings]))
            const data = Array.from({ length: days }, (_, i) => ({
                date: `${now.toLocaleString("default", { month: "short" })} ${i + 1}`,
                bookings: map[i + 1] || 0
            }))
            return res.status(200).json({ success: true, data })
        }

        if (variant === "last7days") {
            const days = 7
            const start = new Date(now); start.setDate(now.getDate() - days + 1); start.setHours(0,0,0,0)
            const raw = await bookingModel.aggregate([
                { $match: { createdAt: { $gte: start } } },
                {
                    $group: {
                        _id: {
                            y: { $year: "$createdAt" },
                            m: { $month: "$createdAt" },
                            d: { $dayOfMonth: "$createdAt" }
                        },
                        bookings: { $sum: 1 }
                    }
                },
                { $sort: { "_id.y": 1, "_id.m": 1, "_id.d": 1 } }
            ])
            const map = {}
            raw.forEach(r => {
                const key = `${r._id.y}-${String(r._id.m).padStart(2,"0")}-${String(r._id.d).padStart(2,"0")}`
                map[key] = r.bookings
            })
            const data = Array.from({ length: days }, (_, i) => {
                const d = new Date(start); d.setDate(start.getDate() + i)
                const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`
                return {
                    date: d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
                    bookings: map[key] || 0
                }
            })
            return res.status(200).json({ success: true, data })
        }

        if (variant === "last12months") {
            const start = new Date(now.getFullYear(), now.getMonth() - 11, 1)
            const raw = await bookingModel.aggregate([
                { $match: { createdAt: { $gte: start } } },
                {
                    $group: {
                        _id: { y: { $year: "$createdAt" }, m: { $month: "$createdAt" } },
                        bookings: { $sum: 1 }
                    }
                },
                { $sort: { "_id.y": 1, "_id.m": 1 } }
            ])
            const map = {}
            raw.forEach(r => { map[`${r._id.y}-${r._id.m}`] = r.bookings })
            const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
            const data = Array.from({ length: 12 }, (_, i) => {
                const d = new Date(start.getFullYear(), start.getMonth() + i, 1)
                const key = `${d.getFullYear()}-${d.getMonth()+1}`
                return {
                    date: `${months[d.getMonth()]} ${d.getFullYear()}`,
                    bookings: map[key] || 0
                }
            })
            return res.status(200).json({ success: true, data })
        }

        return res.status(400).json({ success: false, message: "Invalid variant" })
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message })
    }
}

// ── GET REVENUE TRENDS ─────────────────────────────────────────────────
// variant: "currentMonth" | "last7days" | "last12months"
export const getRevenueTrends = async (req, res) => {
    try {
        const { variant = "currentMonth" } = req.query
        const now = new Date()

        const basePipeline = (matchStage, groupId, sortStage) => [
            { $match: { paymentStatus: "paid", ...matchStage } },
            { $group: { _id: groupId, revenue: { $sum: "$amount" }, adminCut: { $sum: "$adminAmount" } } },
            { $sort: sortStage }
        ]

        if (variant === "currentMonth") {
            const start = startOfMonth(now)
            const raw = await paymentModel.aggregate(basePipeline(
                { paidAt: { $gte: start } },
                { $dayOfMonth: "$paidAt" },
                { _id: 1 }
            ))
            const days = now.getDate()
            const map = Object.fromEntries(raw.map(r => [r._id, r.revenue]))
            const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
            const data = Array.from({ length: days }, (_, i) => ({
                date: `${months[now.getMonth()]} ${i + 1}`,
                revenue: map[i + 1] || 0
            }))
            return res.status(200).json({ success: true, data })
        }

        if (variant === "last7days") {
            const days = 7
            const start = new Date(now); start.setDate(now.getDate() - days + 1); start.setHours(0,0,0,0)
            const raw = await paymentModel.aggregate([
                { $match: { paymentStatus: "paid", paidAt: { $gte: start } } },
                {
                    $group: {
                        _id: {
                            y: { $year: "$paidAt" },
                            m: { $month: "$paidAt" },
                            d: { $dayOfMonth: "$paidAt" }
                        },
                        revenue: { $sum: "$amount" }
                    }
                },
                { $sort: { "_id.y": 1, "_id.m": 1, "_id.d": 1 } }
            ])
            const map = {}
            raw.forEach(r => {
                const key = `${r._id.y}-${String(r._id.m).padStart(2,"0")}-${String(r._id.d).padStart(2,"0")}`
                map[key] = r.revenue
            })
            const data = Array.from({ length: days }, (_, i) => {
                const d = new Date(start); d.setDate(start.getDate() + i)
                const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`
                return {
                    date: d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
                    revenue: map[key] || 0
                }
            })
            return res.status(200).json({ success: true, data })
        }

        if (variant === "last12months") {
            const start = new Date(now.getFullYear(), now.getMonth() - 11, 1)
            const raw = await paymentModel.aggregate(basePipeline(
                { paidAt: { $gte: start } },
                { y: { $year: "$paidAt" }, m: { $month: "$paidAt" } },
                { "_id.y": 1, "_id.m": 1 }
            ))
            const map = {}
            raw.forEach(r => { map[`${r._id.y}-${r._id.m}`] = r.revenue })
            const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
            const data = Array.from({ length: 12 }, (_, i) => {
                const d = new Date(start.getFullYear(), start.getMonth() + i, 1)
                const key = `${d.getFullYear()}-${d.getMonth()+1}`
                return {
                    date: `${months[d.getMonth()]} ${d.getFullYear()}`,
                    revenue: map[key] || 0
                }
            })
            return res.status(200).json({ success: true, data })
        }

        return res.status(400).json({ success: false, message: "Invalid variant" })
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message })
    }
}

// ── GET PROVIDER STATUS DISTRIBUTION ─────────────────────────────────
export const getProviderStatusDistribution = async (req, res) => {
    try {
        const [active, pending, blocked] = await Promise.all([
            serviceProviderModel.countDocuments({ isApproved: true, isDeleted: false, isBlocked: false }),
            serviceProviderModel.countDocuments({ isApproved: false, isDeleted: false, isBlocked: false }),
            serviceProviderModel.countDocuments({ isBlocked: true, isDeleted: false }),
        ])
        return res.status(200).json({
            success: true,
            data: [
                { name: "Active",  value: active },
                { name: "Pending", value: pending },
                { name: "Blocked", value: blocked },
            ]
        })
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message })
    }
}

// ── GET BOOKING STATUS DISTRIBUTION ──────────────────────────────────
export const getBookingStatusDistribution = async (req, res) => {
    try {
        const result = await bookingModel.aggregate([
            { $group: { _id: "$status", count: { $sum: 1 } } }
        ])
        const labelMap = {
            open: "Confirmed",
            accepted: "In Progress",
            closed: "Awaiting Payment",
            completed: "Completed",
            cancelled: "Cancelled"
        }
        const data = result.map(r => ({
            name: labelMap[r._id] || r._id,
            value: r.count
        }))
        return res.status(200).json({ success: true, data })
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message })
    }
}

// ── GET CATEGORY POPULARITY (Top 5) ──────────────────────────────────
export const getCategoryPopularity = async (req, res) => {
    try {
        // Aggregate bookings → services → categories
        const data = await bookingModel.aggregate([
            {
                $lookup: {
                    from: "services",
                    localField: "service",
                    foreignField: "_id",
                    as: "serviceDoc"
                }
            },
            { $unwind: "$serviceDoc" },
            {
                $lookup: {
                    from: "servicecategories",
                    localField: "serviceDoc.category",
                    foreignField: "_id",
                    as: "categoryDoc"
                }
            },
            { $unwind: "$categoryDoc" },
            {
                $group: {
                    _id: "$categoryDoc._id",
                    category: { $first: "$categoryDoc.categoryName" },
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } },
            { $limit: 5 },
            { $project: { _id: 0, category: 1, count: 1 } }
        ])
        return res.status(200).json({ success: true, data })
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message })
    }
}
