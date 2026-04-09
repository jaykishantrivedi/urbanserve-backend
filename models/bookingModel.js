import mongoose from "mongoose"

const bookingSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
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
    serviceRequest: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ServiceRequest",
        required: true
    },
    location: {
        type: String,
        required: true
    },
    serviceDate: {
        type: Date,
        required: true
    },
    serviceTime: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        default: null
    },
    priceType: {
        type: String,
        enum: ["fixed", "hourly", "inspection"],
        required: true
    },
    hoursWorked: {
        type: Number,
        min: 1
    },
    finalPrice: {
        type: Number,
        min: 0
    },
    status: {
        type: String,
        enum: ["open", "accepted", "closed", "completed", "cancelled"],
        default: "open"
    },
    cancelledBy: {
        type: String,
        enum: ["user", "provider", null],
        default: null
    },
    startOTP: {
        type: String,
        trim: true,
        maxlength: 60  // bcrypt hash length
    },
    otpValidUntil: {
        type: Date
    },
    completionOTP: {
        type: String,
        trim: true,
        maxlength: 60  // bcrypt hash length
    },
    completionOTPValidUntil: {
        type: Date
    },
    isPaid: {
        type: Boolean,
        default: false
    }
}, {timestamps: true})

bookingSchema.index({user: 1})
bookingSchema.index({provider: 1})
bookingSchema.index({serviceDate: 1})
bookingSchema.index({serviceTime: 1})

bookingSchema.index(
    {provider: 1, serviceDate: 1, serviceTime: 1},
    {unique: true}
)

export const bookingModel = mongoose.model("Booking", bookingSchema)