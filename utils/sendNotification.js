import { notificationModel } from "../models/notificationModel.js"

export const sendNotification = async (
    recipientType,
    recipient,
    title,
    message,
    type
) => {
    try {
        await notificationModel.create({
            recipientType,
            recipient,
            title,
            message,
            type
        })
    } catch (error) {
        console.error("Notification error: ", error.message)
    }
}