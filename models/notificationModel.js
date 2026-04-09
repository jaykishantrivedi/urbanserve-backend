import mongoose from "mongoose"

const notificationSchema = new mongoose.Schema({
    recipientType: {
        type: String,
        enum: ["user", "provider"],
        required: true
    },
    recipient: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        refPath: "recipientType"
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    message: {
        type: String,
        required: true,
        trim: true
    },
    type: {
        type: String,
        enum: [
            "service_request",
            "provider_response",
            "booking_confirmed",
            "service_completed",
            "payment_received",
            "new_review"
        ],
        required: true
    },
    isRead: {
        type: Boolean,
        default: false
    }
}, {timestamps: true})

notificationSchema.index({recipient: 1})
notificationSchema.index({recipientType: 1})
notificationSchema.index({isRead: 1})

export const notificationModel = mongoose.model("Notification", notificationSchema)