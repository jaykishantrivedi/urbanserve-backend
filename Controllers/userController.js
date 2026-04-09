import { userModel } from "../models/userModel.js"
import { bookingModel } from "../models/bookingModel.js"

export const getUserProfile = async (req, res) => {
    try {
        const userId = req.user.userId

        const user = await userModel.findById(userId).select("-password -resetPasswordToken -resetPasswordExpiresAt -refreshToken")
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            })
        }

        const totalBookings = await bookingModel.countDocuments({ user: userId })
        const completedBookings = await bookingModel.countDocuments({ user: userId, status: "closed" })

        return res.status(200).json({
            success: true,
            user,
            stats: {
                totalBookings,
                completedBookings,
                loyaltyPoints: 0 // Placeholder logic for now
            }
        })
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Error fetching user profile",
            error: error.message
        })
    }
}

export const updateUserProfile = async (req, res) => {
    try {
        const userId = req.user.userId
        const { name, phone, city, address, pfpUrl } = req.body

        const user = await userModel.findById(userId)

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            })
        }

        if (name !== undefined) user.name = name
        if (phone !== undefined) user.phone = phone
        if (city !== undefined) user.city = city
        if (address !== undefined) user.address = address
        if (pfpUrl !== undefined) user.pfpUrl = pfpUrl

        await user.save()

        // Return updated user omitting sensitive Info
        const updatedUser = await userModel.findById(userId).select("-password -resetPasswordToken -resetPasswordExpiresAt -refreshToken")

        return res.status(200).json({
            success: true,
            message: "Profile updated successfully",
            user: updatedUser
        })

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Error updating user profile",
            error: error.message
        })
    }
}
