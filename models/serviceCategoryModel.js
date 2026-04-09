import mongoose from "mongoose"

const serviceCategorySchema = new mongoose.Schema({
    categoryName: {
        type: String,
        required: true,
        trim: true
    },
    slug: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    description: {
        type: String
    },
    iconUrl: {
        type: String
    },
    isActive: {
        type: Boolean,
        default: true
    }
},{ timestamps: true })

export const serviceCategoryModel = mongoose.model("ServiceCategory",serviceCategorySchema)