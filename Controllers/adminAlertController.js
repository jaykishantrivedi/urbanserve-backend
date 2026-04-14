import { adminAlertModel } from "../models/adminAlertModel.js"

//  GET all admin alerts (most recent 20, unread first) 
export const getAdminAlerts = async (req, res) => {
    try {
        const alerts = await adminAlertModel
            .find()
            .sort({ isRead: 1, createdAt: -1 })
            .limit(20)
            .lean()

        const unreadCount = await adminAlertModel.countDocuments({ isRead: false })

        return res.status(200).json({
            success: true,
            alerts,
            unreadCount
        })
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message })
    }
}

//  MARK single alert as read 
export const markAdminAlertRead = async (req, res) => {
    try {
        const { alertId } = req.params

        const alert = await adminAlertModel.findByIdAndUpdate(
            alertId,
            { isRead: true },
            { new: true }
        )

        if (!alert) {
            return res.status(404).json({ success: false, message: "Alert not found" })
        }

        return res.status(200).json({ success: true, message: "Alert marked as read" })
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message })
    }
}

//  MARK ALL alerts as read 
export const markAllAdminAlertsRead = async (req, res) => {
    try {
        await adminAlertModel.updateMany({ isRead: false }, { isRead: true })
        return res.status(200).json({ success: true, message: "All alerts marked as read" })
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message })
    }
}

//  Helper: create an alert (used internally by other controllers) 
export const createAdminAlert = async ({ type, title, message, refId = null, refModel = null }) => {
    try {
        await adminAlertModel.create({ type, title, message, refId, refModel })
    } catch (err) {
        console.error("Failed to create admin alert:", err.message)
    }
}
