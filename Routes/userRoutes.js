import express from "express"
import { protect } from "../middleware/authMiddleware.js"
import { getUserProfile, updateUserProfile } from "../Controllers/userController.js"

export const userRouter = express.Router()

userRouter.get("/profile", protect, getUserProfile)
userRouter.put("/profile", protect, updateUserProfile)

