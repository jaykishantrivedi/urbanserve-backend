import express from "express"
import { changePassword, deleteAccount, forgotPassword, googleAuth, login, logout, refreshTokenController, resendOTP, resendPhoneOtp, resetPassword, sendPhoneOtp, signup, verifyOTP, verifyPhoneOtp, sendEmailChangeOtp, verifyEmailChangeOtp } from "../Controllers/authController.js"
import { protect } from "../middleware/authMiddleware.js"
import { userOnly } from "../middleware/userOnly.js"
import { authLimiter, otpLimiter } from "../middleware/rateLimiter.js"

export const authRouter = express.Router()

authRouter.post("/signup", authLimiter, signup)
authRouter.post("/verifyOTP-email", verifyOTP)
authRouter.post("/resendOTP-email", otpLimiter, resendOTP)
authRouter.post("/sendPhoneOtp", protect, otpLimiter, sendPhoneOtp)
authRouter.post("/verifyPhoneOtp", protect, verifyPhoneOtp)
authRouter.post("/resendPhoneOtp", protect, otpLimiter, resendPhoneOtp)
authRouter.post("/sendEmailChangeOtp", protect, otpLimiter, sendEmailChangeOtp)
authRouter.post("/verifyEmailChangeOtp", protect, verifyEmailChangeOtp)
authRouter.post("/changePassword", protect, changePassword)
authRouter.post("/signin", authLimiter, login)
authRouter.post("/forgot-password", authLimiter, forgotPassword)
authRouter.post("/reset-password", authLimiter, resetPassword)
authRouter.post("/logout", logout)
authRouter.delete("/delete-account", protect, deleteAccount)

authRouter.post("/refresh-token", refreshTokenController)
authRouter.post("/googleAuth", authLimiter, googleAuth)
