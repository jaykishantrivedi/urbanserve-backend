import express from "express"
import { protect } from "../middleware/authMiddleware.js"
import { userOnly } from "../middleware/userOnly.js"
import { providerOnly } from "../middleware/providerOnly.js"
import { createPaymentOrder, verifyRazorpayPayment, createCashPayment, getUserPayments, getProviderPayments, getPaymentById } from "../Controllers/paymentController.js"

export const paymentRoute = express.Router()

paymentRoute.post("/createPaymentOrder/:bookingId", protect, userOnly, createPaymentOrder)
paymentRoute.post("/verifyRazorpayPayment/:bookingId", protect, userOnly, verifyRazorpayPayment)
paymentRoute.post("/createCashPayment/:bookingId", protect, userOnly, createCashPayment)
paymentRoute.get("/getUserPayments", protect, userOnly, getUserPayments)
paymentRoute.get("/getProviderPayments", protect, providerOnly, getProviderPayments)
paymentRoute.get("/getPaymentById/:paymentId", protect, getPaymentById)