import { serviceProviderModel } from "../models/serviceProviderModel.js"
import { bookingModel } from "../models/bookingModel.js"
import { userModel } from "../models/userModel.js"
import { providerServiceModel } from "../models/providerServiceModel.js"

// GET ALL PROVIDERS (admin, paginated, searchable, filterable)
export const getAdminProviders = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            search = "",
            status = "all",  // "all" | "approved" | "pending" | "blocked"
        } = req.query

        const pageNum = Math.max(1, parseInt(page))
        const limitNum = Math.min(100, Math.max(1, parseInt(limit)))

        const filter = { isDeleted: false }

        if (search.trim()) {
            filter.$or = [
                { businessName: { $regex: search.trim(), $options: "i" } },
                { city: { $regex: search.trim(), $options: "i" } },
            ]
        }

        if (status === "approved") { filter.isApproved = true; filter.isBlocked = false }
        if (status === "pending") { filter.isApproved = false; filter.isBlocked = false }
        if (status === "blocked") { filter.isBlocked = true }

        const [providers, total, totalAll, totalApproved, totalPending, totalBlocked] =
            await Promise.all([
                serviceProviderModel
                    .find(filter)
                    .select("businessName city rating totalServicesCompleted isApproved isBlocked walletBalance createdAt user")
                    .populate("user", "email phone")
                    .sort({ createdAt: -1 })
                    .skip((pageNum - 1) * limitNum)
                    .limit(limitNum)
                    .lean(),

                serviceProviderModel.countDocuments(filter),

                serviceProviderModel.countDocuments({ isDeleted: false }),
                serviceProviderModel.countDocuments({ isApproved: true, isBlocked: false, isDeleted: false }),
                serviceProviderModel.countDocuments({ isApproved: false, isBlocked: false, isDeleted: false }),
                serviceProviderModel.countDocuments({ isBlocked: true, isDeleted: false }),
            ])

        const enriched = providers.map(p => ({
            ...p,
            email: p.user?.email || "",
            phone: p.user?.phone || "",
            status: p.isBlocked ? "blocked" : p.isApproved ? "approved" : "pending",
        }))

        return res.status(200).json({
            success: true,
            providers: enriched,
            pagination: {
                total,
                page: pageNum,
                limit: limitNum,
                totalPages: Math.ceil(total / limitNum),
            },
            kpis: {
                totalProviders: totalAll,
                approvedProviders: totalApproved,
                pendingProviders: totalPending,
                blockedProviders: totalBlocked,
            },
        })
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message })
    }
}

// GET SINGLE PROVIDER
export const getAdminProviderById = async (req, res) => {
    try {
        const { providerId } = req.params
        const provider = await serviceProviderModel
            .findById(providerId)
            .populate("user", "email phone name isVerified createdAt")
            .lean()

        if (!provider || provider.isDeleted) {
            return res.status(404).json({ success: false, message: "Provider not found" })
        }

        const [totalBookings, completed, cancelled, inProgress] = await Promise.all([
            bookingModel.countDocuments({ provider: providerId }),
            bookingModel.countDocuments({ provider: providerId, status: "completed" }),
            bookingModel.countDocuments({ provider: providerId, status: "cancelled" }),
            bookingModel.countDocuments({ provider: providerId, status: { $in: ["open", "accepted"] } }),
        ])

        return res.status(200).json({
            success: true,
            provider: {
                ...provider,
                email: provider.user?.email || "",
                phone: provider.user?.phone || "",
                status: provider.isBlocked ? "blocked" : provider.isApproved ? "approved" : "pending",
            },
            bookingStats: { totalBookings, completed, cancelled, inProgress },
        })
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message })
    }
}

// APPROVE PROVIDER
export const approveProvider = async (req, res) => {
    try {
        const { providerId } = req.params
        const provider = await serviceProviderModel.findById(providerId).populate("user", "role")
        if (!provider || provider.isDeleted) {
            return res.status(404).json({ success: false, message: "Provider not found" })
        }
        if (provider.isApproved) {
            return res.status(400).json({ success: false, message: "Provider is already approved" })
        }
        provider.isApproved = true
        provider.user.role = "provider"
        await provider.save()
        await provider.user.save()
        return res.status(200).json({ success: true, message: "Provider approved successfully" })
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message })
    }
}

// TOGGLE BLOCK / UNBLOCK PROVIDER
export const toggleProviderBlock = async (req, res) => {
    try {
        const { providerId } = req.params
        const provider = await serviceProviderModel.findById(providerId)
        if (!provider || provider.isDeleted) {
            return res.status(404).json({ success: false, message: "Provider not found" })
        }
        provider.isBlocked = !provider.isBlocked
        await provider.save()
        return res.status(200).json({
            success: true,
            message: provider.isBlocked ? "Provider blocked successfully" : "Provider unblocked successfully",
            isBlocked: provider.isBlocked,
        })
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message })
    }
}

// REJECT (pending) PROVIDER
export const rejectProvider = async (req, res) => {
    try {
        const { providerId } = req.params
        const provider = await serviceProviderModel.findById(providerId)
        if (!provider || provider.isDeleted) {
            return res.status(404).json({ success: false, message: "Provider not found" })
        }
        if (provider.isApproved) {
            return res.status(400).json({ success: false, message: "Cannot reject an already-approved provider" })
        }
        provider.isBlocked = true  // rejected = blocked while still unapproved
        await provider.save()
        return res.status(200).json({ success: true, message: "Provider rejected successfully" })
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message })
    }
}

// GET PROVIDER SERVICES (admin view)
export const getAdminProviderServices = async (req, res) => {
    try {
        const { providerId } = req.params
        const services = await providerServiceModel
            .find({ provider: providerId, isDeleted: false })
            .populate({
                path: "service",
                select: "serviceName slug description category imageUrl",
                populate: { path: "category", select: "categoryName slug" }
            })
            .sort({ createdAt: -1 })
            .lean()

        return res.status(200).json({
            success: true,
            count: services.length,
            services
        })
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message })
    }
}

export const deleteProvider = async (req, res) => {
    try {
        const { providerId } = req.params
        const provider = await serviceProviderModel.findById(providerId)
        if (!provider || provider.isDeleted) {
            return res.status(404).json({ success: false, message: "Provider not found" })
        }
        provider.isDeleted = true
        await provider.save()
        return res.status(200).json({ success: true, message: "Provider deleted successfully" })
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message })
    }
}
