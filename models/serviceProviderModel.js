import mongoose from "mongoose"

const serviceProviderSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    businessName: {
        type: String,
        required: true
    },
    description: {
        type: String
    },
    experience: {
        type: Number,
        default: 0
    },
    city: {
        type: String,
        required: true
    },
    address: {
        type: String
    },
    profileImage: {
        type: String
    },
    certifications: {
        type: String
    },
    rating: {
        type: Number,
        default: 0
    },
    totalReviews: {
        type: Number,
        default: 0
    },
    starCount: {
        1: {type: Number, default: 0},
        2: {type: Number, default: 0},
        3: {type: Number, default: 0},
        4: {type: Number, default: 0},
        5: {type: Number, default: 0}
    },
    isApproved: {
        type: Boolean,
        default: false
    },
    isAvailable: {
        type: Boolean,
        default: true
    },
    isBlocked: {
        type: Boolean,
        default: false
    },
    isDeleted: {
        type: Boolean,
        default: false
    },
    workingHours: [
        {
            day: String,
            start: String,
            end: String
        }
    ],
    totalServicesCompleted: {
        type: Number,
        default: 0
    },
    serviceRadius: {
        type: Number,
        default: 10
    },
    latitude: {
        type: String
    },
    longitude: {
        type: String
    },
    documents: [{
        type: String
    }],
    gallery: [{
        type: String
    }],
    availability: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    vacationMode: {
        type: Boolean,
        default: false
    },
    walletBalance: {
        type: Number,
        default: 0,
        min: 0
    }
}, {timestamps: true})

export const serviceProviderModel = mongoose.model("ServiceProvider", serviceProviderSchema)