import mongoose from "mongoose";
import { type } from "os";

const userSchema = mongoose.Schema({
    name: { type: String, required: [true, "UserName is required."] },
    email: { type: String, required: [true, "Email is required."], unique: true },
    password: String,
    phone: { type: String, unique: true, sparse: true, default: undefined },
    role: { type: String, enum: ["user", "provider", "admin"], default: "user" },
    status: { type: String, enum: ["active", "blocked"], default: "active" },
    address: { type: String },
    city: { type: String },
    pfpUrl: { type: String, default: null },
    isDeleted: { type: Boolean, default: false },
    isBlocked: { type: Boolean, default: false },  
    isVerified: { type: Boolean, default: false },
    isPhoneVerified: { type: Boolean, default: false },
    lastLogin: { type: Date, default: Date.now },

    verificationToken: String,
    verificationTokenExpiresAt: Date,

    otpAttempts: { type: Number, default: 0 },
    lastOTPSentAt: Date,

    phoneOtp: String,
    phoneOtpExpiresAt: Date,
    phoneOtpAttempts: { type: Number, default: 0 },
    lastPhoneOtpSentAt: Date,

    // Pending fields used while changing phone/email via OTP
    pendingPhone: { type: String, default: undefined },
    pendingEmail: { type: String, default: undefined },

    emailChangeOtp: String,
    emailChangeOtpExpiresAt: Date,
    emailChangeOtpAttempts: { type: Number, default: 0 },
    lastEmailChangeOtpSentAt: Date,

    resetPasswordToken: String,
    resetPasswordExpiresAt: Date,

    refreshToken: String,
    refreshTokenExpiresAt: Date,
    tokenVersion: { type: Number, default: 0 }

}, { timestamps: true })

export const userModel = mongoose.model("User", userSchema)

// What sparse: true does -- It tells MongoDB Only enforce uniqueness if the field exists



