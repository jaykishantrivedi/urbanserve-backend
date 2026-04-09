import slugify from "slugify"
import { serviceModel } from "../models/serviceModel.js"
import { serviceCategoryModel } from "../models/serviceCategoryModel.js"
import { bookingModel } from "../models/bookingModel.js"

// ── GET ALL SERVICES (admin, paginated, searchable, filterable) ────────
export const getAdminServices = async (req, res) => {
    try {
        const {
            page     = 1,
            limit    = 10,
            search   = "",
            status   = "all",   // "all" | "active" | "inactive"
            category = "all",   // "all" | <categoryId>
        } = req.query

        const pageNum  = Math.max(1, parseInt(page))
        const limitNum = Math.min(100, Math.max(1, parseInt(limit)))

        const filter = {}

        if (search.trim()) {
            filter.serviceName = { $regex: search.trim(), $options: "i" }
        }

        if (status === "active")   filter.isActive = true
        if (status === "inactive") filter.isActive = false

        if (category && category !== "all") {
            filter.category = category
        }

        const [services, total, totalAll, totalActive, totalInactive, thisMonthCount] =
            await Promise.all([
                serviceModel
                    .find(filter)
                    .populate("category", "categoryName slug")
                    .sort({ createdAt: -1 })
                    .skip((pageNum - 1) * limitNum)
                    .limit(limitNum)
                    .lean(),

                serviceModel.countDocuments(filter),

                serviceModel.countDocuments({}),
                serviceModel.countDocuments({ isActive: true }),
                serviceModel.countDocuments({ isActive: false }),

                serviceModel.countDocuments({
                    createdAt: { $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) }
                }),
            ])

        return res.status(200).json({
            success: true,
            services,
            pagination: {
                total,
                page:       pageNum,
                limit:      limitNum,
                totalPages: Math.ceil(total / limitNum) || 1,
            },
            kpis: {
                totalServices:    totalAll,
                activeServices:   totalActive,
                inactiveServices: totalInactive,
                newThisMonth:     thisMonthCount,
            },
        })
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message })
    }
}

// ── GET CATEGORIES LIST (for filter dropdown) ──────────────────────────
export const getAdminServiceCategories = async (req, res) => {
    try {
        const categories = await serviceCategoryModel
            .find({})
            .select("_id categoryName slug")
            .sort({ categoryName: 1 })
            .lean()

        return res.status(200).json({ success: true, categories })
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message })
    }
}

// ── TOGGLE ACTIVE / INACTIVE ──────────────────────────────────────────
export const toggleServiceActive = async (req, res) => {
    try {
        const { serviceId } = req.params
        const service = await serviceModel.findById(serviceId)
        if (!service) {
            return res.status(404).json({ success: false, message: "Service not found" })
        }
        service.isActive = !service.isActive
        await service.save()
        return res.status(200).json({
            success: true,
            message: service.isActive ? "Service activated successfully" : "Service deactivated successfully",
            isActive: service.isActive,
        })
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message })
    }
}

// ── DELETE SERVICE (hard delete — admin only) ─────────────────────────
export const adminDeleteService = async (req, res) => {
    try {
        const { serviceId } = req.params
        const service = await serviceModel.findByIdAndDelete(serviceId)
        if (!service) {
            return res.status(404).json({ success: false, message: "Service not found" })
        }
        return res.status(200).json({ success: true, message: "Service permanently deleted" })
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message })
    }
}
// ── GET SINGLE SERVICE (admin) ────────────────────────────────────────
export const getAdminServiceById = async (req, res) => {
    try {
        const { serviceId } = req.params
        const service = await serviceModel
            .findById(serviceId)
            .populate("category", "_id categoryName slug")
            .lean()

        if (!service) {
            return res.status(404).json({ success: false, message: "Service not found" })
        }

        return res.status(200).json({ success: true, service })
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message })
    }
}

// ── UPDATE SERVICE (admin) ────────────────────────────────────────────
export const adminUpdateService = async (req, res) => {
    try {
        const { serviceId } = req.params
        const { serviceName, description, category, isActive } = req.body

        const service = await serviceModel.findById(serviceId)
        if (!service) {
            return res.status(404).json({ success: false, message: "Service not found" })
        }

        // Update name + regenerate slug if name changed
        if (serviceName && serviceName.trim() !== service.serviceName) {
            const trimmed = serviceName.trim()
            const newSlug = slugify(trimmed, { lower: true, strict: true })

            const conflict = await serviceModel.findOne({ slug: newSlug, _id: { $ne: serviceId } })
            if (conflict) {
                return res.status(400).json({
                    success: false,
                    message: "Another service with this name already exists."
                })
            }

            service.serviceName = trimmed
            service.slug        = newSlug
        }

        if (description !== undefined) service.description = description

        if (category) {
            const cat = await serviceCategoryModel.findById(category)
            if (!cat) {
                return res.status(400).json({ success: false, message: "Invalid category" })
            }
            service.category = category
        }

        if (isActive !== undefined) {
            service.isActive = isActive === "true" || isActive === true
        }

        await service.save()

        const updated = await serviceModel
            .findById(serviceId)
            .populate("category", "_id categoryName slug")
            .lean()

        return res.status(200).json({
            success: true,
            message: "Service updated successfully",
            service: updated,
        })
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message })
    }
}
