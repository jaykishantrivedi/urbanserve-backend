import express from "express"
import { protect } from "../middleware/authMiddleware.js"
import { userOnly } from "../middleware/userOnly.js"
import { cancelServiceRequest, createServiceRequest, getAllServiceRequest, getServiceRequestById, updateServiceRequest } from "../Controllers/serviceRequestController.js"

export const serviceRequestRoute = express.Router()

serviceRequestRoute.post("/createServiceRequest", protect, userOnly, createServiceRequest)
serviceRequestRoute.get("/getAllServiceRequest", protect, userOnly, getAllServiceRequest)
serviceRequestRoute.get("/getServiceRequestById/:id", protect, userOnly, getServiceRequestById)
serviceRequestRoute.put("/updateServiceRequest/:id", protect, userOnly, updateServiceRequest)
serviceRequestRoute.put("/cancelServiceRequest/:id", protect, userOnly, cancelServiceRequest)