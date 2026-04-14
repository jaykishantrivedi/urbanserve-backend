import { adminSettingModel } from "../models/adminSettingModel.js"

// Will be initialized when accessed if not exists
export const getAdminSettings = async (req, res) => {
    try {
        let settings = await adminSettingModel.findOne()
        
        if (!settings) {
            settings = await adminSettingModel.create({
                platformCommission: 10,
                minimumWalletBalance: 100
            })
        }

        return res.status(200).json({
            success: true,
            settings
        })
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        })
    }
}

export const updateAdminSettings = async (req, res) => {
    try {
        const { platformCommission, minimumWalletBalance } = req.body

        let settings = await adminSettingModel.findOne()
        if (!settings) {
            settings = new adminSettingModel()
        }

        if (platformCommission !== undefined) {
            settings.platformCommission = platformCommission
        }
        
        if (minimumWalletBalance !== undefined) {
            settings.minimumWalletBalance = minimumWalletBalance
        }

        await settings.save()

        return res.status(200).json({
            success: true,
            message: "Platform settings updated successfully",
            settings
        })

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        })
    }
}
