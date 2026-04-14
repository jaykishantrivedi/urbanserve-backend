import rateLimit from "express-rate-limit"

//  Shared JSON error handler 
// Returns a clean JSON 429 instead of Express's default HTML response
const jsonHandler = (req, res) => {
    return res.status(429).json({
        success: false,
        message: "Too many requests. Please try again later."
    })
}

//  Auth Limiter 
// Protects: signup, signin, forgot-password, reset-password, googleAuth
// Allows 20 attempts per 15 minutes per IP
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,  // 15 minutes
    limit: 20,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    handler: jsonHandler
})

//  OTP Limiter 
// Allows only 5 OTP requests per 10 minutes per IP
export const otpLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,  // 10 minutes
    limit: 5,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    handler: (req, res) => {
        return res.status(429).json({
            success: false,
            message: "Too many OTP requests. Please wait before trying again."
        })
    }
})
