import express from "express"
import { protect } from "../middleware/authMiddleware.js"
import { userOnly } from "../middleware/userOnly.js"
import { providerOnly } from "../middleware/providerOnly.js"
import { adminOnly } from "../middleware/adminOnly.js"
import { createReview, deleteReview, getAllReviews, getProviderReviews, getSingleReview, providerRatingSummary, updateReview, getUserReviews, getMyReviewForBooking } from "../Controllers/reviewController.js"

export const reviewRoute = express.Router()

reviewRoute.post("/createReview/:bookingId", protect, userOnly, createReview)
reviewRoute.post("/updateReview/:reviewId", protect, userOnly, updateReview)
reviewRoute.delete("/deleteReview/:reviewId", protect, userOnly, deleteReview)
reviewRoute.get("/getProviderReviews/:providerId", getProviderReviews)
reviewRoute.get("/getSingleReview/:reviewId", getSingleReview)
reviewRoute.get("/getAllReviews", protect, adminOnly, getAllReviews)
reviewRoute.get("/providerRatingSummary/:providerId", providerRatingSummary)
reviewRoute.get("/getUserReviews", protect, userOnly, getUserReviews)
reviewRoute.get("/getMyReviewForBooking/:bookingId", protect, userOnly, getMyReviewForBooking)