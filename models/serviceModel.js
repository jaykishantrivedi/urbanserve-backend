import mongoose from "mongoose"

const serviceSchema = new mongoose.Schema({
    serviceName: {
        type: String, 
        required:true
    },
    slug: {
        type: String,
        required: true,
        unique: true
    },
    description: {
        type: String
    },
    imageUrl: [{
        type: String,
        default: null
    }],
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ServiceCategory",
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true })

export const serviceModel = mongoose.model("Service", serviceSchema)