import express from "express"
import { protect } from "../middleware/authMiddleware.js"
import { providerOnly } from "../middleware/providerOnly.js"
import { adminOnly } from "../middleware/adminOnly.js"
import { userOnly } from "../middleware/userOnly.js"
import { adminDeleteServiceProvider, adminRestoreServiceProvider, approveServiceProvider, blockServiceProvider, createServiceProvider, deleteServiceProviderProfile, getAllServiceProviders, getServiceProviderById, getServiceProviderProfile, searchServiceProviderByCity, unblockServiceProvider, updateServiceProviderProfile } from "../Controllers/serviceProviderController.js"
import { isPhoneVerified } from "../middleware/isPhoneVerified.js"

export const serviceProviderRouter = express.Router()

serviceProviderRouter.post("/createServiceProvider", protect, userOnly, isPhoneVerified, createServiceProvider)
serviceProviderRouter.get("/getServiceProviderProfile", protect, providerOnly, getServiceProviderProfile)
serviceProviderRouter.put("/updateServiceProviderProfile", protect, providerOnly, updateServiceProviderProfile)
serviceProviderRouter.delete("/deleteServiceProviderProfile", protect, providerOnly, deleteServiceProviderProfile)

serviceProviderRouter.get("/getAllServiceProvider", getAllServiceProviders)
serviceProviderRouter.get("/getServiceProviderById/:id", getServiceProviderById)
serviceProviderRouter.get("/searchServiceProviderByCity", searchServiceProviderByCity)

serviceProviderRouter.put("/approveServiceProvider/:id", protect, adminOnly, approveServiceProvider)
serviceProviderRouter.put("/blockServiceProvider/:id", protect, adminOnly, blockServiceProvider)
serviceProviderRouter.put("/unblockServiceProvider/:id", protect, adminOnly, unblockServiceProvider)
serviceProviderRouter.delete("/adminDeleteServiceProvider/:id", protect, adminOnly, adminDeleteServiceProvider)
serviceProviderRouter.delete("/adminRestoreServiceProvider/:id", protect, adminOnly, adminRestoreServiceProvider)