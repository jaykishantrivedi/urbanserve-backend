import express from "express"
import { protect } from "../middleware/authMiddleware.js"
import { userOnly } from "../middleware/userOnly.js"
import { cancelBooking, getProviderBookings, getSingleBooking, getUserBookings, setHoursWorked, setInspectionPrice, updateBookingStatus, verifyStartOTP, generateCompletionOTP, verifyCompletionOTP } from "../Controllers/bookingController.js"
import { providerOnly } from "../middleware/providerOnly.js"

export const bookingRoute = express.Router()

bookingRoute.get("/getUserBookings", protect, userOnly, getUserBookings)
bookingRoute.get("/getProviderBookings", protect, providerOnly, getProviderBookings)
bookingRoute.get("/getSingleBooking/:bookingId", protect, getSingleBooking)
bookingRoute.put("/cancelBooking/:bookingId", protect, cancelBooking)
bookingRoute.put("/updateBookingStatus/:bookingId", protect, providerOnly, updateBookingStatus)
bookingRoute.patch("/setHoursWorked/:bookingId", protect, providerOnly, setHoursWorked)
bookingRoute.patch("/setInspectionPrice/:bookingId", protect, providerOnly, setInspectionPrice)
bookingRoute.post("/verifyStartOTP/:bookingId", protect, providerOnly, verifyStartOTP)
bookingRoute.post("/generateCompletionOTP/:bookingId", protect, providerOnly, generateCompletionOTP)
bookingRoute.post("/verifyCompletionOTP/:bookingId", protect, userOnly, verifyCompletionOTP)