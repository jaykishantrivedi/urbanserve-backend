import jwt from "jsonwebtoken"
import { userModel } from "../models/userModel.js"

export const protect = async (req, res, next) => {
    try {
        let token
    
        if(
            req.headers.authorization && req.headers.authorization.startsWith("Bearer ")
        ){
            token = req.headers.authorization.split(" ")[1]
        }

        if(!token && req?.cookies?.token){
            token = req.cookies.token
        }

        if(!token){
            return res.status(401).json({
                success: false,
                message: "Not authorized, access token missing"
            })
        }

        const decoded = await jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)

        const user = await userModel.findById(decoded.userId)

        if(!user){
            return res.status(401).json({
                success: false,
                message: "User not found"
            })
        }

        if(decoded.tokenVersion !== user.tokenVersion){
            return res.status(401).json({
                success: false,
                message: "Token revoked"
            })
        }

        req.user = {
            userId: user._id,
            role: user.role,
            tokenVersion: user.tokenVersion,
            isPhoneVerified: user.isPhoneVerified
        }
        next()
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: error.message
        })
    }
}