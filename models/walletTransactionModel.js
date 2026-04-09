import mongoose from "mongoose"

const walletTransactionSchema = new mongoose.Schema({
    provider: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ServiceProvider",
        required: true
    },
    type: {
        type: String,
        enum: ["credit", "debit"],
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    description: {
        type: String, // Reason: "Added money to wallet", "Platform commission for booking #XYZ"
    },
    referenceId: {
        type: String // Razorpay transaction ID or booking ID
    },
    status: {
        type: String,
        enum: ["pending", "success", "failed"],
        default: "success"
    }
}, {timestamps: true})

export const walletTransactionModel = mongoose.model("WalletTransaction", walletTransactionSchema)
