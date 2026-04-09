import { providerServiceModel } from "../models/providerServiceModel.js"
import { serviceProviderModel } from "../models/serviceProviderModel.js"

export const createProviderService = async (req, res) => {
    try {

        const userId = req.user.userId

        const providerDoc = await serviceProviderModel.findOne({
            user: userId,
            isDeleted: false
        })

        if (!providerDoc) {
            return res.status(404).json({
                success: false,
                message: "Provider profile not found"
            })
        }

        const provider = providerDoc._id

        const { service, price, priceType, experience, description } = req.body

        if (!service || price === undefined || price === null || !priceType) {
            return res.status(400).json({
                success: false,
                message: "Service, Price and PriceType are required"
            })
        }

        const existing = await providerServiceModel.findOne({ provider, service })

        if (existing && !existing.isDeleted) {
            return res.status(400).json({
                success: false,
                message: "Service already added."
            })
        }

        if (existing && existing.isDeleted) {
            existing.isDeleted = false
            existing.deletedAt = null
            existing.price = price
            existing.priceType = priceType || existing.priceType
            existing.experience = experience
            existing.description = description

            await existing.save()

            return res.status(200).json({
                success: true,
                message: "Service restored successfully"
            })
        }

        const providerService = await providerServiceModel.create({
            provider,
            service,
            price,
            priceType,
            experience,
            description
        })

        res.status(201).json({
            success: true,
            message: "Service added successfully",
            providerService
        })

    } catch (error) {

        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: "Service already exists."
            })
        }

        return res.status(500).json({
            success: false,
            message: error.message
        })
    }
}

export const updateProviderService = async (req, res) => {
    try {
        const userId = req.user.userId
        const { id } = req.params

        const providerDoc = await serviceProviderModel.findOne({ user: userId, isDeleted: false })
        if (!providerDoc) return res.status(404).json({ success: false, message: "Provider profile not found" })
        const provider = providerDoc._id

        const { price, priceType, experience, description, isActive } = req.body

        const providerService = await providerServiceModel.findOne(
            {
                _id: id,
                provider,
                isDeleted: false
            }
        )

        if (!providerService) {
            return res.status(404).json({
                success: false,
                message: "Provider service not found"
            })
        }

        if (price !== undefined) providerService.price = price
        if (priceType !== undefined) providerService.priceType = priceType
        if (experience !== undefined) providerService.experience = experience
        if (description !== undefined) providerService.description = description
        if (isActive !== undefined) providerService.isActive = isActive

        await providerService.save()

        res.status(200).json({
            success: true,
            message: "Provider service updated successfully",
            providerService
        })
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        })
    }
}

export const deleteProviderService = async (req, res) => {
    try {
        const userId = req.user.userId
        const { id } = req.params

        const providerDoc = await serviceProviderModel.findOne({ user: userId, isDeleted: false })
        if (!providerDoc) return res.status(404).json({ success: false, message: "Provider profile not found" })
        const provider = providerDoc._id

        const existing = await providerServiceModel.findOneAndUpdate({
            _id: id,
            provider,
            isDeleted: false
        }, { isDeleted: true, deletedAt: new Date() }, { new: true })

        if (!existing) {
            return res.status(404).json({
                success: false,
                message: "Provider service not found."
            })
        }

        res.status(200).json({
            success: true,
            message: "Provider service deleted successfully"
        })
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        })
    }
}

export const getAllProviderService = async (req, res) => {
    try {
        const userId = req.user.userId

        const providerDoc = await serviceProviderModel.findOne({ user: userId, isDeleted: false })
        if (!providerDoc) return res.status(404).json({ success: false, message: "Provider profile not found" })
        const provider = providerDoc._id

        const services = await providerServiceModel.find({ provider, isDeleted: false })
        .populate({
            path:"service",
            select:"category serviceName slug",
            populate:{
                path:"category",
                select:"categoryName slug"
            }
        })

        return res.status(200).json({
            success: true,
            count: services.length,
            services
        })

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        })
    }
}

export const getAllProviderServiceForUser = async (req, res) => {
    try {
        const { id } = req.params;

        const services = await providerServiceModel.find({ provider: id, isDeleted: false, isActive: true }).populate({
            path: "service",
            select: "serviceName slug description category imageUrl",
            populate: {
                path: "category",
                select: "categoryName slug"
            }
        })

        res.status(200).json({
            success: true,
            count: services.length,
            services
        })
        
        
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        })
    }
}

export const getProviderServivceById = async (req, res) => {

    // Used when provider opens service details page.

    try {
        const userId = req.user.userId
        const { id } = req.params

        const providerDoc = await serviceProviderModel.findOne({ user: userId, isDeleted: false })
        if (!providerDoc) return res.status(404).json({ success: false, message: "Provider profile not found" })
        const provider = providerDoc._id

        const service = await providerServiceModel.findOne({
            _id: id,
            provider,
            isDeleted: false
        }).populate({
            path: "service",
            select: "serviceName slug description category",
            populate: {
                path: "category",
                select: "categoryName slug"
            }
        })

        if (!service) {
            return res.status(404).json({
                success: false,
                message: "Provider service not found"
            })
        }

        res.status(200).json({
            success: true,
            service
        })
    } catch (error) {
        return res.status(500).json({
            success: false.valueOf,
            message: error.message
        })
    }

}

export const toggleProviderServiceStatus = async (req, res) => {
    try {

        const userId = req.user.userId
        const { id } = req.params

        const providerDoc = await serviceProviderModel.findOne({ user: userId, isDeleted: false })
        if (!providerDoc) return res.status(404).json({ success: false, message: "Provider profile not found" })
        const provider = providerDoc._id

        const service = await providerServiceModel.findOne({
            _id: id,
            provider,
            isDeleted: false
        })

        if (!service) {
            return res.status(404).json({
                success: false,
                message: "Service not found"
            })
        }

        service.isActive = !service.isActive

        await service.save()

        res.status(200).json({
            success: true,
            message: `Service ${service.isActive ? "activated" : "deactivated"}`,
            service
        })

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        })
    }
}
