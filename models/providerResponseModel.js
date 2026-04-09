import mongoose from "mongoose"

const providerResponseSchema = mongoose.Schema({
    serviceRequest: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ServiceRequest",
        required: true
    },
    provider: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ServiceProvider",
        required: true
    },
    price: {
        type: Number,
        default: null
    },
    priceType: {
        type: String,
        enum: ["fixed", "hourly", "inspection"],
        default: "inspection"
    },
    status: {
        type: String,
        enum: ["pending", "accepted", "declined"],
        default: "pending"
    },
    message: {
        type: String,
        trim: true
    },
    respondedAt: {
        type: Date
    }
}, {timestamps: true})

providerResponseSchema.index({serviceRequest: 1, provider: 1}, {unique: true})

export const providerResponseModel = mongoose.model("ProviderResponse", providerResponseSchema)