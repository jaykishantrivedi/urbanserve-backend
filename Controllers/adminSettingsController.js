import { adminSettingModel } from "../models/adminSettingModel.js"

// ── GET ADMIN SETTINGS ────────────────────────────────────────────────
export const getAdminSettings = async (req, res) => {
    try {
        let settings = await adminSettingModel.findOne()
        
        // Ensure settings exist (create defaults if not)
        if (!settings) {
            settings = await adminSettingModel.create({})
        }
        
        return res.status(200).json({ success: true, settings })
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message })
    }
}

// ── UPDATE ADMIN SETTINGS ─────────────────────────────────────────────
export const updateAdminSettings = async (req, res) => {
    try {
        const updates = req.body

        // Since we only maintain one global settings document, find the first or create
        let settings = await adminSettingModel.findOneAndUpdate(
            {}, 
            { $set: updates }, 
            { new: true, upsert: true }
        )

        return res.status(200).json({ 
            success: true, 
            message: "Settings updated successfully", 
            settings 
        })
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message })
    }
}
