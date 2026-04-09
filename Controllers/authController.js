import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import { userModel } from "../models/userModel.js"
import { sendOTPMail, sendResetPasswordEmail, sendEmailChangeOtpMail } from "../nodemailer/nodemailer.js"
import { generateTokens } from "../utils/generateTokens.js"
import { sendSMS } from "../utils/sendSMS.js"
import crypto from "crypto"

// DETERMINING PASSWORD STRENGTH - Function
const isStrongPassword = (password) => {
    const minLength = password.length >= 8
    const hasUpper = /[A-Z]/.test(password)
    const hasLower = /[a-z]/.test(password)
    const hasNumber = /[0-9]/.test(password)
    const hasSpecial = /[!@#$%^&*]/.test(password)

    return minLength && hasUpper && hasLower && hasNumber && hasSpecial
}

export const signup = async (req, res) => {
    try {
        const { name, password } = req.body
        const email = req.body.email?.toLowerCase().trim()

        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: "Please fill all the fields."
            })
        }

        // Determine & validate password Strength
        if (!isStrongPassword(password)) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 8 characters and include uppercase, lowercase, number, and special character"
            })
        }

        const userAlreadyExists = await userModel.findOne({
            $or: [
                { email: email }
            ]
        })
        if (userAlreadyExists) {
            return res.status(500).json({
                success: false,
                message: "User already exists."
            })
        }

        const hashedPassword = await bcrypt.hash(password, 10)

        const verificationToken = Math.floor(
            100000 + Math.random() * 900000
        ).toString()

        const user = new userModel({
            name,
            email,
            password: hashedPassword,
            isVerified: false,
            verificationToken,
            verificationTokenExpiresAt: Date.now() + 60 * 1000
        })

        await user.save()

        try {
            await sendOTPMail(email, verificationToken, name)
        } catch (error) {
            return res.status(500).json({
                succes: false,
                message: "Failed to send OTP Email"
            })
        }

        res.status(201).json({
            status: true,
            message: "OTP has been successfully sent via Email. Please verify.",
            email: user.email
        })

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        })
        console.log(error);

    }

}

export const verifyOTP = async (req, res) => {
    try {
        const { otp } = req.body
        const email = req.body.email?.toLowerCase().trim()

        if (!email || !otp) {
            return res.status(400).json({
                success: false,
                message: "Email and OTP are required!"
            })
        }

        const user = await userModel.findOne({ email })
        if (!user) {
            return res.status(400).json({
                success: false,
                message: "User not found"
            })
        }

        if (user.isVerified) {
            return res.status(400).json({
                success: false,
                message: "Email is already verified!"
            })
        }

        const MAX_OTP_ATTEMPTS = 5
        if (user.otpAttempts >= MAX_OTP_ATTEMPTS) {
            return res.status(400).json({
                success: false,
                message: "Max OTP attempts reached. Please request for new OTP!"
            })
        }

        if (user.verificationToken !== otp || user.verificationTokenExpiresAt < Date.now()) {
            user.otpAttempts = user.otpAttempts + 1
            await user.save()

            return res.status(400).json({
                success: false,
                message: "Invalid or Expired OTP!"
            })
        }

        user.isVerified = true,
            user.verificationToken = undefined
        user.verificationTokenExpiresAt = undefined
        user.otpAttempts = 0

        await user.save()

        return res.status(201).json({
            success: true,
            message: "Email verified successfully. Please login."
        })

    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error in verifying OTP."
        })
        console.log(error);

    }
}

export const resendOTP = async (req, res) => {
    try {
        const email = req.body.email?.toLowerCase().trim()

        if (!email) {
            return res.status(400).json({
                success: false,
                message: "Email is required."
            })
        }

        const user = await userModel.findOne({ email })
        if (!user) {
            return res.status(400).json({
                success: false,
                message: "User/Email not found."
            })
        }

        if (user.isVerified) {
            return res.status(400).json({
                success: false,
                message: "User/Email is already verified!"
            })
        }

        const COOLDOWN_TIME = 60 * 1000;

        if (user.lastOTPSentAt) {

            const cooldownExpiry = user.lastOTPSentAt.getTime() + COOLDOWN_TIME;

            const remainingMs = cooldownExpiry - Date.now();

            if (remainingMs > 0) {

                const remainingSeconds = Math.floor(remainingMs / 1000);

                return res.status(429).json({
                    success: false,
                    message: `Please wait ${remainingSeconds}s before requesting a new OTP.`,
                });
            }
        }


        const newOTP = Math.floor(100000 + Math.random() * 900000).toString()

        user.verificationToken = newOTP
        user.verificationTokenExpiresAt = Date.now() + 60 * 1000
        user.otpAttempts = 0
        user.lastOTPSentAt = new Date()

        await user.save()

        await sendOTPMail(email, newOTP)

        res.status(201).json({
            success: true,
            message: "New OTP sent successfully!"
        })

    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error in resending OTP."
        })
        console.log(error);

    }
}



export const sendPhoneOtp = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { phone } = req.body;

        if (!phone) {
            return res.status(400).json({
                success: false,
                message: "Please enter phone number"
            });
        }

        const user = await userModel.findById(userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        const formattedPhone = phone.startsWith("+91")
            ? phone
            : `+91${phone}`;

        if (user.phone === formattedPhone && user.isPhoneVerified) {
            return res.status(400).json({
                success: false,
                message: "This is already your verified phone number"
            });
        }

        const existingUser = await userModel.findOne({ phone: formattedPhone, _id: { $ne: userId } });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: "This phone number is already in use by another account"
            });
        }

        const COOLDOWN = 60 * 1000;
        if (user.lastPhoneOtpSentAt) {
            const diff = Date.now() - user.lastPhoneOtpSentAt.getTime();
            if (diff < COOLDOWN) {
                return res.status(429).json({
                    success: false,
                    message: "Please wait before requesting another OTP"
                });
            }
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const hashedOtp = await bcrypt.hash(otp, 10);

        user.pendingPhone = formattedPhone;
        user.phoneOtp = hashedOtp;
        user.phoneOtpExpiresAt = Date.now() + 3 * 60 * 1000; // 3 min
        user.phoneOtpAttempts = 0;
        user.lastPhoneOtpSentAt = new Date();

        try {
            await user.save();
            console.log("Pending phone OTP data saved ");
        } catch (dbError) {
            console.log("DB Error:", dbError);
            return res.status(500).json({
                success: false,
                message: "Failed to save OTP data",
                error: dbError.message
            });
        }

        //  Send SMS to the new (pending) number
        try {
            await sendSMS(formattedPhone, otp);
            console.log("OTP sent via SMS ");
        } catch (smsError) {
            console.log("Twilio Error:", smsError);
            return res.status(500).json({
                success: false,
                message: "Failed to send OTP"
            });
        }

        return res.status(200).json({
            success: true,
            message: "OTP successfully sent via SMS."
        });

    } catch (error) {
        console.log("Controller Error:", error);
        return res.status(500).json({
            success: false,
            message: "Something went wrong",
            error: error.message
        });
    }
};

export const verifyPhoneOtp = async (req, res) => {
    try {
        const userId = req.user.userId
        const { otp } = req.body

        if (!otp) {
            return res.status(400).json({
                success: false,
                message: "Please enter OTP"
            })
        }

        const user = await userModel.findById(userId)
        if (!user) {
            return res.status(400).json({
                success: false,
                message: "User not found"
            })
        }

        if (!user.pendingPhone) {
            return res.status(400).json({
                success: false,
                message: "No pending phone number to verify. Please request an OTP first."
            })
        }

        const MAX_ATTEMPTS = 5
        if (user.phoneOtpAttempts >= MAX_ATTEMPTS) {
            return res.status(429).json({
                success: false,
                message: "Maximum OTP attempts exceeded. Request new OTP"
            })
        }

        if (!user.phoneOtpExpiresAt || user.phoneOtpExpiresAt < Date.now()) {
            return res.status(400).json({
                success: false,
                message: "OTP expired. Please request a new one."
            })
        }

        const isValidOtp = await bcrypt.compare(otp, user.phoneOtp)
        if (!isValidOtp) {
            user.phoneOtpAttempts += 1
            await user.save()
            return res.status(400).json({
                success: false,
                message: "Invalid OTP"
            })
        }

        //  Promote pending phone to live phone
        user.phone = user.pendingPhone
        user.pendingPhone = undefined
        user.phoneOtpAttempts = 0
        user.phoneOtpExpiresAt = undefined
        user.phoneOtp = undefined
        user.isPhoneVerified = true

        await user.save()

        return res.status(200).json({
            success: true,
            message: "Phone number updated and verified successfully"
        })

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        })
    }
}

// ------------------- EMAIL CHANGE OTP -------------------

export const sendEmailChangeOtp = async (req, res) => {
    try {
        const userId = req.user.userId
        const newEmail = req.body.email?.toLowerCase().trim()

        if (!newEmail) {
            return res.status(400).json({
                success: false,
                message: "Please provide a new email address"
            })
        }

        const user = await userModel.findById(userId)
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            })
        }

        // Block if same as current verified email
        if (user.email === newEmail && user.isVerified) {
            return res.status(400).json({
                success: false,
                message: "This is already your verified email address"
            })
        }

        const existing = await userModel.findOne({ email: newEmail, _id: { $ne: userId } })
        if (existing) {
            return res.status(400).json({
                success: false,
                message: "This email is already in use by another account"
            })
        }

        const COOLDOWN = 60 * 1000
        if (user.lastEmailChangeOtpSentAt) {
            const diff = Date.now() - user.lastEmailChangeOtpSentAt.getTime()
            if (diff < COOLDOWN) {
                const remaining = Math.ceil((COOLDOWN - diff) / 1000)
                return res.status(429).json({
                    success: false,
                    message: `Please wait ${remaining}s before requesting another OTP`
                })
            }
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString()
        const hashedOtp = await bcrypt.hash(otp, 10)

        user.pendingEmail = newEmail
        user.emailChangeOtp = hashedOtp
        user.emailChangeOtpExpiresAt = Date.now() + 3 * 60 * 1000 // 3 min
        user.emailChangeOtpAttempts = 0
        user.lastEmailChangeOtpSentAt = new Date()

        await user.save()

        try {
            await sendEmailChangeOtpMail(newEmail, otp, user.name)
        } catch (mailErr) {
            console.log("Email send error:", mailErr)
            return res.status(500).json({
                success: false,
                message: "Failed to send OTP email"
            })
        }

        return res.status(200).json({
            success: true,
            message: "OTP sent to your new email address"
        })

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        })
    }
}

export const verifyEmailChangeOtp = async (req, res) => {
    try {
        const userId = req.user.userId
        const { otp } = req.body

        if (!otp) {
            return res.status(400).json({
                success: false,
                message: "Please enter the OTP"
            })
        }

        const user = await userModel.findById(userId)
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            })
        }

        if (!user.pendingEmail) {
            return res.status(400).json({
                success: false,
                message: "No pending email change found. Please request an OTP first."
            })
        }

        const MAX_ATTEMPTS = 5
        if (user.emailChangeOtpAttempts >= MAX_ATTEMPTS) {
            return res.status(429).json({
                success: false,
                message: "Maximum OTP attempts exceeded. Please request a new OTP."
            })
        }

        if (!user.emailChangeOtpExpiresAt || user.emailChangeOtpExpiresAt < Date.now()) {
            return res.status(400).json({
                success: false,
                message: "OTP has expired. Please request a new one."
            })
        }

        const isValidOtp = await bcrypt.compare(otp, user.emailChangeOtp)
        if (!isValidOtp) {
            user.emailChangeOtpAttempts += 1
            await user.save()
            return res.status(400).json({
                success: false,
                message: "Invalid OTP"
            })
        }

        //  Promote pending email to live email
        user.email = user.pendingEmail
        user.pendingEmail = undefined
        user.emailChangeOtp = undefined
        user.emailChangeOtpExpiresAt = undefined
        user.emailChangeOtpAttempts = 0
        user.isVerified = true

        await user.save()

        return res.status(200).json({
            success: true,
            message: "Email address updated and verified successfully"
        })

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        })
    }
}

export const resendPhoneOtp = async (req, res) => {
    try {
        const userId = req.user.userId

        const user = await userModel.findById(userId)
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            })
        }

        if (user.isPhoneVerified) {
            return res.status(400).json({
                success: false,
                message: "Phone number is already verified"
            })
        }

        const COOLDOWN = 60 * 1000

        if (user.lastPhoneOtpSentAt) {
            const diff = Date.now() - user.lastPhoneOtpSentAt.getTime()

            if (diff < COOLDOWN) {
                const remaining = Math.ceil((COOLDOWN - diff) / 1000)

                return res.status(429).json({
                    success: false,
                    message: `Please wait ${remaining}s before requesting another OTP`
                })
            }
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString()

        try {
            await sendSMS(user.phone, otp)
        } catch (error) {
            return res.status(400).json({
                success: false,
                message: "Error in sending otp via sms."
            })
        }

        const hashedOtp = await bcrypt.hash(otp, 10)

        user.phoneOtp = hashedOtp
        user.phoneOtpAttempts = 0
        user.phoneOtpExpiresAt = 3 * 60 * 1000
        user.lastPhoneOtpSentAt = new Date()

        await user.save()

        return res.status(200).json({
            success: false,
            message: "OTP resent successfully"
        })

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        })
    }
}

export const login = async (req, res) => {
    try {
        const { password } = req.body
        const email = req.body.email?.toLowerCase().trim()

        if (!password || !email) {
            return res.status(400).json({
                success: false,
                message: "Please enter Email and password."
            })
        }

        const user = await userModel.findOne({ email })
        if (!user) {
            return res.status(400).json({
                success: false,
                message: "User not found."
            })
        }

        if (!user.isVerified) {
            return res.status(400).json({
                success: false,
                message: "Please verify your Email first."
            })
        }

        const isCorrectPassword = await bcrypt.compare(password, user.password)
        if (!isCorrectPassword) {
            return res.status(400).json({
                success: false,
                message: "Invalid Password"
            })
        }

        const accessToken = await generateTokens(user, res)

        res.status(200).json({
            success: true,
            message: "Login successfull",
            accessToken,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                pfpUrl: user.pfpUrl || null,   // ← added
                role: user.role                 // ← added
            }
        })
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error in login API.",
            error: error.message
        })
        console.log(error)
    }
}

export const logout = async (req, res) => {
    try {
        const refreshToken = req.cookies.refreshToken

        if (refreshToken) {
            const hashedToken = crypto
                .createHash("sha256")
                .update(refreshToken)
                .digest("hex")

            await userModel.updateOne(
                { refreshToken: hashedToken },
                { $unset: { refreshToken: 1, refreshTokenExpiresAt: 1 } }
            )
        }

        // Clear access token cookie (was missing — caused token to persist after logout)
        res.clearCookie("token", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax"
        })

        // Clear refresh token cookie — sameSite must match how it was SET ("lax"), not "strict"
        res.clearCookie("refreshToken", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax"
        })


        res.status(200).json({
            success: true,
            message: "Logged out successfully"
        })

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        })
        console.log(error);

    }
}

export const forgotPassword = async (req, res) => {
    try {

        const email = req.body.email?.toLowerCase().trim()

        if (!email) {
            return res.status(400).json({
                success: false,
                message: "Email is required"
            })
        }

        const user = await userModel.findOne({ email })

        // SECURITY: Don't reveal if user exists or not
        if (!user) {
            return res.status(200).json({
                success: true,
                message: "If account exists, reset link has been sent"
            })
        }

        const resetToken = crypto.randomBytes(32).toString("hex")

        // 2️⃣ Hash token before saving (VERY IMPORTANT)
        const hashedToken = crypto
            .createHash("sha256")
            .update(resetToken)
            .digest("hex")

        user.resetPasswordToken = hashedToken
        user.resetPasswordExpiresAt = Date.now() + 15 * 60 * 1000 // 15 minutes

        await user.save()

        const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`

        try {
            await sendResetPasswordEmail(user.email, resetUrl)
        } catch (error) {
            return res.status(400).json({
                success: false,
                message: "Error in sending password reset link."
            })
        }

        res.status(200).json({
            success: true,
            message: "Password reset link sent to email"
        })

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        })
    }
}

export const resetPassword = async (req, res) => {
    try {
        const { token, newPassword } = req.body

        if (!token || !newPassword) {
            return res.status(400).json({
                success: false,
                message: "Token and new password required"
            })
        }

        if (!isStrongPassword(newPassword)) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 8 characters long and include uppercase, lowercase, number and special character"
            })
        }


        const hashedToken = crypto
            .createHash("sha256")
            .update(token)
            .digest("hex")

        const user = await userModel.findOne({
            resetPasswordToken: hashedToken,
            resetPasswordExpiresAt: { $gt: Date.now() }
        })

        if (!user) {
            return res.status(400).json({
                success: false,
                message: "Invalid or expired reset token"
            })
        }

        user.password = await bcrypt.hash(newPassword, 10)

        user.tokenVersion += 1

        user.resetPasswordToken = undefined
        user.resetPasswordExpiresAt = undefined

        await user.save()

        res.status(200).json({
            success: true,
            message: "Password reset successful"
        })

    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Reset password failed",
            error: error.message
        })
    }
}

export const changePassword = async (req, res) => {
    try {

        const userId = req.user.userId
        const { currentPassword, newPassword, confirmNewPassword } = req.body

        if (!currentPassword || !newPassword || !confirmNewPassword) {
            return res.status(400).json({
                success: false,
                message: "Please fill all the fields"
            })
        }

        if (newPassword !== confirmNewPassword) {
            return res.status(400).json({
                success: false,
                message: "New Password and confirm New Password does not match"
            })
        }

        if (!isStrongPassword(newPassword)) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 8 characters and include uppercase, lowercase, number, and special character"
            })
        }

        const user = await userModel.findOne({ _id: userId })
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            })
        }

        const isMatch = await bcrypt.compare(currentPassword, user.password)
        if (!isMatch) {
            return res.status(400).json({
                success: false,
                message: "Current password is incorrect"
            })
        }

        const isSame = await bcrypt.compare(newPassword, user.password)
        if (isSame) {
            return res.status(400).json({
                success: false,
                message: "New password must be different from old password"
            })
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10)

        user.password = hashedPassword
        await user.save()

        return res.status(200).json({
            success: true,
            message: "Password changed successfully",
        })

    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        })
    }
}

const hashToken = (token) => {
    return crypto.createHash("sha256").update(token).digest("hex")
}

export const refreshTokenController = async (req, res) => {
    try {
        const refreshToken = req.cookies.refreshToken

        if (!refreshToken) {
            return res.status(401).json({
                success: false,
                message: "No refresh token provided. Please login."
            })
        }

        const hashedToken = hashToken(refreshToken)

        const user = await userModel.findOne({
            refreshToken: hashedToken,
            refreshTokenExpiresAt: { $gt: Date.now() }
        })

        if (!user) {
            res.clearCookie("refreshToken")
            return res.status(401).json({
                success: false,
                message: "Session expired or invalid. Please login again."
            })
        }

        const newAccessToken = jwt.sign(
            { userId: user._id, role: user.role, tokenVersion: user.tokenVersion },
            process.env.ACCESS_TOKEN_SECRET,
            { expiresIn: "15m" }
        )

        // 3b️⃣ Set new access token as httpOnly cookie
        res.cookie("token", newAccessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 15 * 60 * 1000
        })

        const newRefreshToken = crypto.randomBytes(40).toString("hex")
        user.refreshToken = hashToken(newRefreshToken)
        user.refreshTokenExpiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000
        await user.save()

        res.cookie("refreshToken", newRefreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 7 * 24 * 60 * 60 * 1000
        })

        return res.status(200).json({
            success: true,
            accessToken: newAccessToken
        })

    } catch (error) {
        console.error("Refresh token error:", error)
        return res.status(500).json({
            success: false,
            message: error.message
        })
    }
}

//         const email = req.body.email?.toLowerCase().trim()

//                 message: "Name, email and profile picture are required"

//         const user = await userModel.findOne({email})


//         const accessToken = await generateTokens(user, res)



export const googleAuth = async (req, res) => {
    try {
        const { name, pfpUrl } = req.body
        const email = req.body.email?.toLowerCase().trim()

        if (!name || !email) {
            return res.status(400).json({
                success: false,
                message: "Name, email and profile picture are required"
            })
        }

        let user = await userModel.findOne({ email })   // ← added let (was const, caused bug)

        if (!user) {
            user = await userModel.create({
                name,
                email,
                pfpUrl,
                isVerified: true
            })
        }

        const accessToken = await generateTokens(user, res)

        res.status(200).json({
            success: true,
            message: "Login successfull",
            accessToken,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                pfpUrl: user.pfpUrl || null,   // ← added
                role: user.role                 // ← added
            }
        })

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        })
    }
}
export const deleteAccount = async (req, res) => {
    try {
        const userId = req.user.userId
        const user = await userModel.findById(userId)
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            })
        }
        if (user.isDeleted) {
            return res.status(400).json({
                success: false,
                message: "User is already deleted"
            })
        }
        user.isDeleted = true
        await user.save()
        return res.status(200).json({
            success: true,
            message: "User deleted successfully"
        })
    } catch (error) {
        console.error("deleteAccount Error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Internal Server Error"
        });
    }
};