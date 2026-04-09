import express from "express"
import { protect } from "../middleware/authMiddleware.js"
import { adminOnly } from "../middleware/adminOnly.js"
import { createService, deleteService, getAllService, getDeletedServices, getServiceBySlug, getServicesByCategories, restoreService, searchService, updateService } from "../Controllers/serviceController.js"
import upload from "../middleware/multer.js"

export const serviceRouter = express.Router()

serviceRouter.post("/createService", protect, adminOnly, upload.array("image"), createService)
serviceRouter.put("/updateService/:id", protect, adminOnly, upload.array("image"), updateService)
serviceRouter.delete("/deleteService/:id", protect, adminOnly, deleteService)
serviceRouter.patch("/restoreService/:id", protect, adminOnly, restoreService)
serviceRouter.get("/getDeletedService", protect, adminOnly, getDeletedServices)

serviceRouter.get("/getAllService", getAllService)
serviceRouter.get("/getServiceBySlug/:slug", getServiceBySlug)
serviceRouter.get("/getServicesByCategory/:slug", getServicesByCategories)
serviceRouter.get("/searchService", searchService)