import mongoose from "mongoose"

const providerServiceSchema = new mongoose.Schema({
    provider: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ServiceProvider",
        required: true
    },
    service: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Service",
        required: true
    },
    price: {
        type: Number,
        required: true,
        min: 0
    },
    priceType: {
        type: String,
        enum: ["fixed", "hourly", "inspection"],
        default: "fixed"
    },
    experience: {
        type: Number,
        min: 0
    },
    description: {
        type: String,
        trim: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    isDeleted: {
        type: Boolean,
        default: false
    },
    deletedAt: {
        type: Date,
        default: null
    }
}, {timestamps: true})

providerServiceSchema.index(
  { provider: 1, service: 1 },
  {
    unique: true,
    partialFilterExpression: { isDeleted: false }
  }
)

export const providerServiceModel = mongoose.model("ProviderService", providerServiceSchema)