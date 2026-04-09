import express from "express"
import { protect } from "../middleware/authMiddleware.js"
import { gotNotification, markAllNotificationsAsRead, markNotificationAsRead } from "../Controllers/notificationController.js"

export const notificationRoutes = express.Router()

notificationRoutes.get("/gotNotification", protect, gotNotification)
notificationRoutes.get("/markNotificationAsRead/:notificationId", protect, markNotificationAsRead)
notificationRoutes.get("/markAllNotificationsAsRead", protect, markAllNotificationsAsRead)