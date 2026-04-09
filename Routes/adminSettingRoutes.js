import express from "express"
import { getAdminSettings, updateAdminSettings } from "../Controllers/adminSettingsController.js"

const router = express.Router()

router.get("/", getAdminSettings)
router.post("/", updateAdminSettings)
router.put("/", updateAdminSettings)

export default router
