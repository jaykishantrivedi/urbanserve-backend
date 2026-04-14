import { reviewModel } from "../models/reviewModel.js"

// GET ALL REVIEWS (admin, paginated, searchable, filterable)
export const getAdminReviews = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            search = "",
            rating = "all", // "all" | "5" | "4" | "3" | "2" | "1"
        } = req.query

        const pageNum = Math.max(1, parseInt(page))
        const limitNum = Math.min(100, Math.max(1, parseInt(limit)))

        const pipelineMatch = []
        if (rating !== "all") {
            pipelineMatch.push({ $match: { rating: parseInt(rating) } })
        }

        const pipeline = [
            ...pipelineMatch,

            { $lookup: { from: "users", localField: "user", foreignField: "_id", as: "userDoc" } },
            { $lookup: { from: "serviceproviders", localField: "provider", foreignField: "_id", as: "providerDoc" } },
            { $lookup: { from: "services", localField: "service", foreignField: "_id", as: "serviceDoc" } },

            { $unwind: { path: "$userDoc", preserveNullAndEmptyArrays: true } },
            { $unwind: { path: "$providerDoc", preserveNullAndEmptyArrays: true } },
            { $unwind: { path: "$serviceDoc", preserveNullAndEmptyArrays: true } },

            ...(search.trim()
                ? [{
                    $match: {
                        $or: [
                            { "userDoc.name": { $regex: search.trim(), $options: "i" } },
                            { "providerDoc.businessName": { $regex: search.trim(), $options: "i" } },
                            { "serviceDoc.serviceName": { $regex: search.trim(), $options: "i" } },
                            { "review": { $regex: search.trim(), $options: "i" } },
                        ]
                    }
                }]
                : []),

            {
                $project: {
                    _id: 1,
                    booking: 1,
                    rating: 1,
                    review: 1,
                    user: "$userDoc.name",
                    provider: "$providerDoc.businessName",
                    service: "$serviceDoc.serviceName",
                    date: "$createdAt"
                }
            },
            { $sort: { date: -1 } }
        ]

        const dataPipeline = [...pipeline, { $skip: (pageNum - 1) * limitNum }, { $limit: limitNum }]
        const countPipeline = [...pipeline, { $count: "total" }]

        // We run isolated KPI query so it ignores search query/pagination limits and calculates global stats
        const [reviews, countResult, globalStats] = await Promise.all([
            reviewModel.aggregate(dataPipeline),
            reviewModel.aggregate(countPipeline),
            reviewModel.aggregate([
                {
                    $group: {
                        _id: null,
                        totalReviews: { $sum: 1 },
                        totalRatingSum: { $sum: "$rating" },
                        fiveStarReviews: { $sum: { $cond: [{ $eq: ["$rating", 5] }, 1, 0] } },
                        lowRatings: { $sum: { $cond: [{ $lte: ["$rating", 2] }, 1, 0] } },
                        count5: { $sum: { $cond: [{ $eq: ["$rating", 5] }, 1, 0] } },
                        count4: { $sum: { $cond: [{ $eq: ["$rating", 4] }, 1, 0] } },
                        count3: { $sum: { $cond: [{ $eq: ["$rating", 3] }, 1, 0] } },
                        count2: { $sum: { $cond: [{ $eq: ["$rating", 2] }, 1, 0] } },
                        count1: { $sum: { $cond: [{ $eq: ["$rating", 1] }, 1, 0] } },
                    }
                }
            ])
        ])

        const total = countResult[0]?.total || 0
        const stats = globalStats[0] || {}

        const kpis = {
            totalReviews: stats.totalReviews || 0,
            averageRating: stats.totalReviews ? (stats.totalRatingSum / stats.totalReviews).toFixed(1) : "0.0",
            fiveStarReviews: stats.fiveStarReviews || 0,
            lowRatings: stats.lowRatings || 0,
            ratingDistribution: [
                { rating: 5, count: stats.count5 || 0, percentage: stats.totalReviews ? ((stats.count5 / stats.totalReviews) * 100).toFixed(0) : 0 },
                { rating: 4, count: stats.count4 || 0, percentage: stats.totalReviews ? ((stats.count4 / stats.totalReviews) * 100).toFixed(0) : 0 },
                { rating: 3, count: stats.count3 || 0, percentage: stats.totalReviews ? ((stats.count3 / stats.totalReviews) * 100).toFixed(0) : 0 },
                { rating: 2, count: stats.count2 || 0, percentage: stats.totalReviews ? ((stats.count2 / stats.totalReviews) * 100).toFixed(0) : 0 },
                { rating: 1, count: stats.count1 || 0, percentage: stats.totalReviews ? ((stats.count1 / stats.totalReviews) * 100).toFixed(0) : 0 },
            ]
        }

        return res.status(200).json({
            success: true,
            reviews,
            pagination: {
                total,
                page: pageNum,
                limit: limitNum,
                totalPages: Math.ceil(total / limitNum) || 1,
            },
            kpis,
        })
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message })
    }
}

// DELETE REVIEW (Admin only)
export const adminDeleteReview = async (req, res) => {
    try {
        const { reviewId } = req.params

        const review = await reviewModel.findById(reviewId)
        if (!review) return res.status(404).json({ success: false, message: "Review not found" })

        // Optional: Could trigger downstream recalculation of provider's total rating here
        await reviewModel.findByIdAndDelete(reviewId)

        return res.status(200).json({ success: true, message: "Review deleted successfully" })
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message })
    }
}
