import mongoose from "mongoose"

const adminAlertSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ["new_provider_pending"],
        required: true
    },
    title: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    isRead: {
        type: Boolean,
        default: false
    },
    // Optional ref to the related document (e.g. provider id)
    refId: {
        type: mongoose.Schema.Types.ObjectId,
        default: null
    },
    refModel: {
        type: String,
        default: null
    }
}, { timestamps: true })

adminAlertSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30 })
adminAlertSchema.index({ isRead: 1 })

export const adminAlertModel = mongoose.model("AdminAlert", adminAlertSchema)
