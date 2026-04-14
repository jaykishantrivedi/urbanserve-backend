import express, { json } from "express"
import dotenv from "dotenv"
import cookieParser from "cookie-parser";
import cors from "cors";
import { connectDb } from "./config/db.js"
import { authRouter } from "./Routes/authRoutes.js"
import { serviceCategoryRouter } from "./Routes/serviceCategoryRoutes.js"
import { serviceRouter } from "./Routes/serviceRoutes.js";
import { serviceProviderRouter } from "./Routes/serviceProviderRoutes.js";
import { providerServiceRoutes } from "./Routes/providerServiceRoutes.js";
import { serviceRequestRoute } from "./Routes/serviceRequestRoutes.js"
import { providerResponseRoute } from "./Routes/providerResponseRoutes.js"
import { bookingRoute } from "./Routes/bookingRoutes.js";
import { reviewRoute } from "./Routes/reviewRoutes.js";
import { paymentRoute } from "./Routes/paymentRoute.js";
import { notificationRoutes } from "./Routes/notificationRoutes.js";
import { searchRouter } from "./Routes/searchRoutes.js";
import { userRouter } from "./Routes/userRoutes.js";
import walletRoutes from "./Routes/walletRoutes.js";
import adminSettingRoutes from "./Routes/adminSettingRoutes.js";
import { adminDashboardRouter } from "./Routes/adminDashboardRoutes.js";
dotenv.config()

connectDb()

const app = express()

const PORT = process.env.PORT || 5000

app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true
}));

// console.log("Auth Router:", authRouter)
app.use("/api/auth", authRouter)
app.use("/api/service-categories", serviceCategoryRouter)
app.use("/api/services", serviceRouter)
app.use("/api/service-providers", serviceProviderRouter)
app.use("/api/provider-services", providerServiceRoutes)
app.use("/api/service-requests", serviceRequestRoute)
app.use("/api/provider-responses", providerResponseRoute)
app.use("/api/bookings", bookingRoute)
app.use("/api/reviews", reviewRoute)
app.use("/api/payments", paymentRoute)
app.use("/api/notifications", notificationRoutes)
app.use("/api/search", searchRouter)
app.use("/api/users", userRouter)
app.use("/api/wallet", walletRoutes)
app.use("/api/admin-settings", adminSettingRoutes)
app.use("/api/admin/dashboard", adminDashboardRouter)

app.listen(PORT,()=>{
    console.log(`Server is running at PORT : ${PORT}`);
})
