import express from "express"
import { protect } from "../middleware/authMiddleware.js"
import { adminOnly } from "../middleware/adminOnly.js"
import { providerOnly } from "../middleware/providerOnly.js"
import {
    getDashboardKPIs,
    getBookingTrends,
    getRevenueTrends,
    getProviderStatusDistribution,
    getBookingStatusDistribution,
    getCategoryPopularity,
} from "../Controllers/adminDashboardController.js"
import { getAdminUsers, toggleUserBlock, getAdminUserById } from "../Controllers/adminUsersController.js"
import {
    getAdminProviders, getAdminProviderById,
    approveProvider, toggleProviderBlock, deleteProvider, rejectProvider,
    getAdminProviderServices,
} from "../Controllers/adminProvidersController.js"
import {
    getAdminServices, getAdminServiceCategories,
    getAdminServiceById, adminUpdateService,
    toggleServiceActive, adminDeleteService,
} from "../Controllers/adminServicesController.js"
import {
    getAdminCategories, getAdminCategoryById,
    adminCreateCategory, adminUpdateCategory,
    toggleCategoryActive, adminDeleteCategory,
} from "../Controllers/adminCategoriesController.js"
import upload from "../middleware/multer.js"
import {
    getAdminBookings, getAdminBookingById,
    adminCancelBooking, adminMarkCompleted,
} from "../Controllers/adminBookingsController.js"
import {
    getAdminPayments, adminRefundPayment, adminFailPayment
} from "../Controllers/adminPaymentsController.js"
import {
    getAdminReviews, adminDeleteReview
} from "../Controllers/adminReviewsController.js"
import {
    getAdminNotifications, adminToggleNotificationStatus, adminDeleteNotification
} from "../Controllers/adminNotificationsController.js"
import {
    getAdminSettings, updateAdminSettings
} from "../Controllers/adminSettingsController.js"
import {
    getAdminAlerts, markAdminAlertRead, markAllAdminAlertsRead
} from "../Controllers/adminAlertController.js"

export const adminDashboardRouter = express.Router()

// adminDashboardRouter.use(protect, adminOnly)

adminDashboardRouter.get("/kpis", protect, adminOnly, getDashboardKPIs)
adminDashboardRouter.get("/booking-trends", protect, adminOnly, getBookingTrends)
adminDashboardRouter.get("/revenue-trends", protect, adminOnly, getRevenueTrends)
adminDashboardRouter.get("/provider-status", protect, adminOnly, getProviderStatusDistribution)
adminDashboardRouter.get("/booking-status", protect, adminOnly, getBookingStatusDistribution)
adminDashboardRouter.get("/category-popularity", protect, adminOnly, getCategoryPopularity)

adminDashboardRouter.get("/users", protect, adminOnly, getAdminUsers)
adminDashboardRouter.get("/users/:userId", protect, adminOnly, getAdminUserById)
adminDashboardRouter.patch("/users/:userId/block", protect, adminOnly, toggleUserBlock)

adminDashboardRouter.get("/providers", protect, adminOnly, getAdminProviders)
adminDashboardRouter.get("/providers/:providerId", protect, adminOnly, getAdminProviderById)
adminDashboardRouter.get("/providers/:providerId/services", protect, adminOnly, getAdminProviderServices)
adminDashboardRouter.patch("/providers/:providerId/approve", protect, adminOnly, approveProvider)
adminDashboardRouter.patch("/providers/:providerId/reject", protect, adminOnly, rejectProvider)
adminDashboardRouter.patch("/providers/:providerId/block", protect, adminOnly, toggleProviderBlock)
adminDashboardRouter.delete("/providers/:providerId", protect, adminOnly, deleteProvider)

adminDashboardRouter.get("/services", protect, adminOnly, getAdminServices)
adminDashboardRouter.get("/services/categories", protect, adminOnly, getAdminServiceCategories)
adminDashboardRouter.get("/services/:serviceId", protect, adminOnly, getAdminServiceById)
adminDashboardRouter.put("/services/:serviceId", protect, adminOnly, adminUpdateService)
adminDashboardRouter.patch("/services/:serviceId/toggle-active", protect, adminOnly, toggleServiceActive)
adminDashboardRouter.delete("/services/:serviceId", protect, adminOnly, adminDeleteService)

adminDashboardRouter.get("/categories", protect, adminOnly, getAdminCategories)
adminDashboardRouter.post("/categories", protect, adminOnly, upload.single("image"), adminCreateCategory)
adminDashboardRouter.get("/categories/:categoryId", protect, adminOnly, getAdminCategoryById)
adminDashboardRouter.put("/categories/:categoryId", protect, adminOnly, upload.single("image"), adminUpdateCategory)
adminDashboardRouter.patch("/categories/:categoryId/toggle-active", protect, adminOnly, toggleCategoryActive)
adminDashboardRouter.delete("/categories/:categoryId", protect, adminOnly, adminDeleteCategory)

adminDashboardRouter.get("/bookings", protect, adminOnly, getAdminBookings)
adminDashboardRouter.get("/bookings/:bookingId", protect, adminOnly, getAdminBookingById)
adminDashboardRouter.patch("/bookings/:bookingId/cancel", protect, adminOnly, adminCancelBooking)
adminDashboardRouter.patch("/bookings/:bookingId/complete", protect, adminOnly, adminMarkCompleted)

adminDashboardRouter.get("/payments", protect, adminOnly, getAdminPayments)
adminDashboardRouter.patch("/payments/:paymentId/refund", protect, adminOnly, adminRefundPayment)
adminDashboardRouter.patch("/payments/:paymentId/fail", protect, adminOnly, adminFailPayment)

adminDashboardRouter.get("/reviews", protect, adminOnly, getAdminReviews)
adminDashboardRouter.delete("/reviews/:reviewId", protect, adminOnly, adminDeleteReview)

adminDashboardRouter.get("/notifications", protect, adminOnly, getAdminNotifications)
adminDashboardRouter.patch("/notifications/:notificationId/toggle", protect, adminOnly, adminToggleNotificationStatus)
adminDashboardRouter.delete("/notifications/:notificationId", protect, adminOnly, adminDeleteNotification)

adminDashboardRouter.get("/settings", protect, adminOnly, getAdminSettings)
adminDashboardRouter.put("/settings", protect, adminOnly, updateAdminSettings)

adminDashboardRouter.get("/alerts", protect, adminOnly, getAdminAlerts)
adminDashboardRouter.patch("/alerts/mark-all-read", protect, adminOnly, markAllAdminAlertsRead)
adminDashboardRouter.patch("/alerts/:alertId/read", protect, adminOnly, markAdminAlertRead)
