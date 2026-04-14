import jwt from "jsonwebtoken"
import crypto from "crypto"

export const generateTokens = async (user, res) => {
    const accessToken = jwt.sign(
        {
            userId: user._id,
            role: user.role,
            tokenVersion: user.tokenVersion
        },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: "15m" }
    )

    const refreshToken = crypto.randomBytes(40).toString("hex")

    const hashedRefreshToken = crypto.createHash("sha256").update(refreshToken).digest("hex")

    user.refreshToken = hashedRefreshToken
    user.refreshTokenExpiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000
    await user.save()

    res.cookie("token", accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "none",
        maxAge: 15 * 60 * 1000
    })

    res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "none",
        maxAge: 7 * 24 * 60 * 60 * 1000
    })

    return accessToken
}

