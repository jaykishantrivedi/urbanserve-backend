import mongoose from "mongoose"

const adminSettingSchema = new mongoose.Schema({
    platformName: {
        type: String,
        default: "UrbanServe"
    },
    currency: {
        type: String,
        default: "INR"
    },
    timeFormat: {
        type: String,
        default: "12-hour"
    },
    platformCommission: {
        type: Number,
        default: 15 // Updated default 15%
    },
    minimumWalletBalance: {
        type: Number,
        default: 100
    },
    maximumCashLimit: {
        type: Number,
        default: 5000
    },
    emailNotifications: {
        type: Boolean,
        default: true
    },
    smsNotifications: {
        type: Boolean,
        default: true
    },
    pushNotifications: {
        type: Boolean,
        default: false
    }
}, {timestamps: true})

export const adminSettingModel = mongoose.model("AdminSetting", adminSettingSchema)
