import express from "express"
import { protect } from "../middleware/authMiddleware.js"
import { providerOnly } from "../middleware/providerOnly.js"
import { createProviderService, deleteProviderService, getAllProviderService, getAllProviderServiceForUser, getProviderServivceById, toggleProviderServiceStatus, updateProviderService } from "../controllers/providerServiceController.js"

export const providerServiceRoutes = express.Router()

providerServiceRoutes.post("/createProviderService", protect, providerOnly, createProviderService)
providerServiceRoutes.put("/updateProviderService/:id", protect, providerOnly, updateProviderService)
providerServiceRoutes.delete("/deleteProviderService/:id", protect, providerOnly, deleteProviderService)
providerServiceRoutes.get("/getAllProviderService", protect, providerOnly, getAllProviderService)
providerServiceRoutes.get("/getProviderServivceById/:id", protect, providerOnly, getProviderServivceById)
providerServiceRoutes.put("/toggleProviderServiceStatus/:id", protect, providerOnly, toggleProviderServiceStatus)


providerServiceRoutes.get("/getAllProviderServiceForUser/:id", getAllProviderServiceForUser)