import mongoose from "mongoose"

const paymentSchema = new mongoose.Schema({
    booking: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Booking",
        required: true,
        unique: true
    },
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
    amount: {
        type: Number,
        required: true,
        min: 0
    },
    paymentMethod: {
        type: String,
        enum: ["upi", "card", "netbanking", "wallet", "cash", "razorpay", "online"],
        required: true
    },
    paymentStatus: {
        type: String,
        enum: ["pending", "paid", "failed", "refunded"],
        default: "pending"
    },
    gateway: {
        type: String,
        enum: ["razorpay", "stripe", "cash", "manual"],
        default: "razorpay"
    },
    transactionId: {
        type: String
    },
    gatewayOrderId: {
        type: String
    },
    razorpaySignature: {
        type: String
    },
    platformCommissionPct: {
        type: Number,
        default: 10
    },
    adminAmount: {
        type: Number,
        default: 0
    },
    providerAmount: {
        type: Number,
        default: 0
    },
    paidAt: {
        type: Date
    }
}, {timestamps: true})

paymentSchema.index({user: 1})
paymentSchema.index({provider: 1})

export const paymentModel = mongoose.model("Payment", paymentSchema)