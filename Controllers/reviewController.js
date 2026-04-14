import { bookingModel } from "../models/bookingModel.js"
import { reviewModel } from "../models/reviewModel.js"
import { serviceProviderModel } from "../models/serviceProviderModel.js"
import { sendNotification } from "../utils/sendNotification.js"
import mongoose from "mongoose"

const calculateAverageRating = (starCount, totalReviews) => {
    if (totalReviews === 0) return 0

    const totalStars = Object.entries(starCount).reduce((acc, [star, count]) => acc + Number(star) * count, 0)

    return totalStars/totalReviews
}

export const createReview = async (req, res) => {
    try {
        const userId = req.user.userId
        const { bookingId } = req.params
        const { rating, review } = req.body

        if (!mongoose.Types.ObjectId.isValid(bookingId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid booking ID"
            })
        }

        const booking = await bookingModel
            .findOne({ user: userId, _id: bookingId })
            .populate("user", "name")
            .populate("provider", "_id")
            .populate("service", "serviceName")

        if (!booking) {
            return res.status(404).json({
                success: false,
                message: "Booking not found"
            })
        }

        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({
                success: false,
                message: "Rating must be between 1 and 5"
            })
        }

        if (booking.status !== "completed") {
            return res.status(400).json({
                success: false,
                message: "Review allowed only after payment is completed"
            })
        }

        const existingReview = await reviewModel.findOne({ booking: bookingId })

        if (existingReview) {
            return res.status(400).json({
                success: false,
                message: "Review already submitted for this booking"
            })
        }

        await reviewModel.create({
            booking: bookingId,
            user: userId,
            provider: booking.provider,
            service: booking.service,
            rating,
            review
        })

        const provider = await serviceProviderModel.findById(booking.provider._id)
        if(!provider){
            return res.status(404).json({
                success: false,
                message: "Provider not found"
            })
        }

        provider.totalReviews += 1
        provider.starCount[rating] += 1

        provider.rating = calculateAverageRating(
            provider.starCount,
            provider.totalReviews
        )

        await provider.save()

        await sendNotification(
            "provider",
            booking.provider._id,
            "New review",
            `You have received a new review from a customer named ${booking.user.name} for ${booking.service.serviceName}`,
            "new_review"
        )

        return res.status(201).json({
            success: true,
            message: "Review created successfully"
        })

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        })
    }
}

export const updateReview = async (req, res) => {
    try {
        const userId = req.user.userId
        const { reviewId } = req.params
        const { rating, review } = req.body

        const existingReview = await reviewModel.findOne({ user: userId, _id: reviewId })
        if (!existingReview) {
            return res.status(404).json({
                success: false,
                message: "Review not found"
            })
        }

        if (review === undefined && rating === undefined) {
            return res.status(400).json({
                success: false,
                message: "Nothing to update"
            })
        }

        const oldRating = existingReview.rating

        if(rating !== undefined && rating !== oldRating){
            
            if(rating < 1 || rating > 5){
                return res.status(400).json({
                    success: false,
                    message: "Rating must be between 1 and 5"
                })
            }

            const provider = await serviceProviderModel.findById(existingReview.provider)
            if(!provider){
                return res.status(404).json({
                    success: false,
                    message: "Provider not found"
                })
            }

            provider.starCount[oldRating] = Math.max(0, provider.starCount[oldRating] - 1)
            provider.starCount[rating] += 1

            provider.rating = calculateAverageRating(
                provider.starCount,
                provider.totalReviews
            )

            await provider.save()

            existingReview.rating = rating
        }

        if(review !== undefined){
            existingReview.review = review
        }

        await existingReview.save()

        return res.status(200).json({
            success: true,
            message: "Review updated successfully",
            review: existingReview
        })
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        })
    }
}

export const deleteReview = async (req, res) => {
    try {
        const userId = req.user.userId
        const { reviewId } = req.params

        const review = await reviewModel.findOneAndDelete({ _id: reviewId, user: userId })
        if (!review) {
            return res.status(404).json({
                success: false,
                message: "Review not found"
            })
        }

        const provider = await serviceProviderModel.findById(review.provider) 
        if(!provider){
            return res.status(404).json({
                success: false,
                message: "Provider not found"
            })
        }
        
        provider.totalReviews = Math.max(0, provider.totalReviews - 1)
        provider.starCount[review.rating] = Math.max(0, provider.starCount[review.rating] - 1)

        provider.rating = calculateAverageRating(
            provider.starCount,
            provider.totalReviews
        )

        await provider.save()

        return res.status(200).json({
            success: true,
            message: "Review deleted successfully"
        })

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        })
    }
}

export const getProviderReviews = async (req, res) => {
    try {
        const { providerId } = req.params

        if (!mongoose.Types.ObjectId.isValid(providerId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid provider id"
            })
        }

        const reviews = await reviewModel
            .find({ provider: providerId })
            .populate("user", "name")
            .populate("service", "serviceName")
            .sort({ createdAt: -1 })

        return res.status(200).json({
            success: true,
            total: reviews.length,
            reviews
        })
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        })
    }
}

export const getSingleReview = async (req, res) => {
    try {
        const { reviewId } = req.params

        const review = await reviewModel
            .findById(reviewId)
            .populate("user", "name")
            .populate("service", "serviceName")
            .populate("provider", "businessName")

        if (!review) {
            return res.status(404).json({
                success: false,
                message: "Review not found"
            })
        }

        return res.status(200).json({
            success: true,
            review
        })
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        })
    }
}

export const getAllReviews = async (req, res) => {
    try {
        const reviews = await reviewModel
            .find()
            .populate("user", "name")
            .populate("service", "serviceName")
            .populate("provider", "businessName")
            .sort({ createdAt: -1 })

        return res.status(200).json({
            success: true,
            total: reviews.length,
            reviews
        })

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        })
    }
}

export const providerRatingSummary = async (req, res) => {
    try {

        const { providerId } = req.params

        if (!mongoose.Types.ObjectId.isValid(providerId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid provider id"
            })
        }

        const providerObjectId = new mongoose.Types.ObjectId(providerId)

        const summary = await reviewModel.aggregate([
            {
                $match: { provider: providerObjectId }
            },
            {
                $group: {
                    _id: providerObjectId,
                    avgRating: { $avg: "$rating" },
                    totalReviews: { $sum: 1 },
                    fiveStar: {
                        $sum: {
                            $cond: [{ $eq: ["$rating", 5] }, 1, 0]
                        }
                    },
                    fourStar: {
                        $sum: {
                            $cond: [{ $eq: ["$rating", 4] }, 1, 0]
                        }
                    },
                    threeStar: {
                        $sum: {
                            $cond: [{ $eq: ["$rating", 3] }, 1, 0]
                        }
                    },
                    twoStar: {
                        $sum: {
                            $cond: [{ $eq: ["$rating", 2] }, 1, 0]
                        }
                    },
                    oneStar: {
                        $sum: {
                            $cond: [{ $eq: ["$rating", 1] }, 1, 0]
                        }
                    }
                }
            }
        ])

        // Notice: aggregation returns an ARRAY So we take the first element.
        const result = summary[0] || {
            avgRating: 0,
            totalReviews: 0,
            fiveStar: 0,
            fourStar: 0,
            threeStar: 0,
            twoStar: 0,
            oneStar: 0
        }

        return res.status(200).json({
            success: true,
            summary: result
        })

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        })
    }
}

export const getUserReviews = async (req, res) => {
    try {
        const userId = req.user.userId

        const reviews = await reviewModel
            .find({ user: userId })
            .populate("service", "serviceName")
            .populate("provider", "businessName")
            .sort({ createdAt: -1 })

        return res.status(200).json({ success: true, total: reviews.length, reviews })
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message })
    }
}

export const getMyReviewForBooking = async (req, res) => {
    try {
        const userId = req.user.userId
        const { bookingId } = req.params

        const review = await reviewModel.findOne({ user: userId, booking: bookingId })

        return res.status(200).json({ success: true, review: review || null })
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message })
    }
}