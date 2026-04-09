import mongoose from "mongoose"

const serviceRequestSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    service: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Service",
        required: true
    },
    message: {
        type: String,
        trim: true
    },
    location: {
        type: String,
        required: true,
        trim: true
    },
    address: {
        type: String,
        required: true,
        trim: true
    },
    preferredDate: {
        type: Date
    },
    preferredTime: {
        type: String
    },
    status: {
        type: String,
        enum: ["open", "accepted", "closed", "cancelled"],
        default: "open"
    }
}, {timestamps: true})

serviceRequestSchema.index({ user: 1 })
serviceRequestSchema.index({ service: 1, status: 1})

export const serviceRequestModel = mongoose.model("ServiceRequest", serviceRequestSchema)