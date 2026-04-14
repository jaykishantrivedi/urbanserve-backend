import slugify from "slugify"
import { serviceCategoryModel } from "../models/serviceCategoryModel.js"
import { serviceModel } from "../models/serviceModel.js"
import { uploadOnCloudinary, deleteOnCloudinary } from "../utils/cloudinary.js"

// GET ALL CATEGORIES (admin, paginated, searchable, filterable) 
export const getAdminCategories = async (req, res) => {
    try {
        const {
            page   = 1,
            limit  = 10,
            search = "",
            status = "all",   // "all" | "active" | "inactive"
        } = req.query

        const pageNum  = Math.max(1, parseInt(page))
        const limitNum = Math.min(100, Math.max(1, parseInt(limit)))

        const filter = {}
        if (search.trim()) {
            filter.categoryName = { $regex: search.trim(), $options: "i" }
        }
        if (status === "active")   filter.isActive = true
        if (status === "inactive") filter.isActive = false

        const [rawCats, total, totalAll, totalActive, totalInactive, thisMonthCount] =
            await Promise.all([
                serviceCategoryModel
                    .find(filter)
                    .sort({ categoryName: 1 })
                    .skip((pageNum - 1) * limitNum)
                    .limit(limitNum)
                    .lean(),

                serviceCategoryModel.countDocuments(filter),

                serviceCategoryModel.countDocuments({}),
                serviceCategoryModel.countDocuments({ isActive: true }),
                serviceCategoryModel.countDocuments({ isActive: false }),

                serviceCategoryModel.countDocuments({
                    createdAt: { $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) }
                }),
            ])

        const categoryIds = rawCats.map(c => c._id)
        const serviceCounts = await serviceModel.aggregate([
            { $match: { category: { $in: categoryIds } } },
            { $group: { _id: "$category", count: { $sum: 1 } } },
        ])
        const countMap = Object.fromEntries(serviceCounts.map(s => [s._id.toString(), s.count]))

        const categories = rawCats.map(c => ({
            ...c,
            totalServices: countMap[c._id.toString()] || 0,
        }))

        return res.status(200).json({
            success: true,
            categories,
            pagination: {
                total,
                page:       pageNum,
                limit:      limitNum,
                totalPages: Math.ceil(total / limitNum) || 1,
            },
            kpis: {
                totalCategories:    totalAll,
                activeCategories:   totalActive,
                inactiveCategories: totalInactive,
                newThisMonth:       thisMonthCount,
            },
        })
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message })
    }
}

// GET SINGLE CATEGORY 
export const getAdminCategoryById = async (req, res) => {
    try {
        const { categoryId } = req.params
        const category = await serviceCategoryModel.findById(categoryId).lean()
        if (!category) {
            return res.status(404).json({ success: false, message: "Category not found" })
        }
        const totalServices = await serviceModel.countDocuments({ category: categoryId })
        return res.status(200).json({ success: true, category: { ...category, totalServices } })
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message })
    }
}

    export const adminCreateCategory = async (req, res) => {
        try {
            let { categoryName, description, isActive } = req.body
            let iconUrl = ""

            if (req.file) {
                const uploadedUrl = await uploadOnCloudinary(req.file.path)
                if (uploadedUrl) iconUrl = uploadedUrl
            }

            if (!categoryName?.trim()) {
                return res.status(400).json({ success: false, message: "Category name is required" })
            }

            categoryName = categoryName.trim()
            const slug = slugify(categoryName, { lower: true, strict: true })

            const existing = await serviceCategoryModel.findOne({ slug })
            if (existing) {
                return res.status(400).json({
                    success: false,
                    message: existing.isActive
                        ? "Category already exists"
                        : "Category exists but is inactive. Reactivate it instead.",
                })
            }

            const category = await serviceCategoryModel.create({
                categoryName,
                slug,
                description,
                iconUrl,
                isActive: isActive === "true" || isActive === true
            })

        return res.status(201).json({ success: true, message: "Category created successfully", category })
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message })
    }
}

// UPDATE CATEGORY 
export const adminUpdateCategory = async (req, res) => {
    try {
        const { categoryId } = req.params
        const { categoryName, description, isActive } = req.body

        const category = await serviceCategoryModel.findById(categoryId)
        if (!category) {
            return res.status(404).json({ success: false, message: "Category not found" })
        }

        if (categoryName && categoryName.trim() !== category.categoryName) {
            const trimmed = categoryName.trim()
            const newSlug = slugify(trimmed, { lower: true, strict: true })
            const conflict = await serviceCategoryModel.findOne({ slug: newSlug, _id: { $ne: categoryId } })
            if (conflict) {
                return res.status(400).json({ success: false, message: "Another category with this name already exists" })
            }
            category.categoryName = trimmed
            category.slug         = newSlug
        }

        if (description !== undefined) category.description = description
        if (isActive    !== undefined) category.isActive    = isActive === "true" || isActive === true

        if (req.file) {
            const uploadedUrl = await uploadOnCloudinary(req.file.path)
            if (uploadedUrl) {
                if (category.iconUrl) {
                    await deleteOnCloudinary(category.iconUrl)
                }
                category.iconUrl = uploadedUrl
            }
        }

        await category.save()
        return res.status(200).json({ success: true, message: "Category updated successfully", category })
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message })
    }
}

// TOGGLE ACTIVE / INACTIVE 
export const toggleCategoryActive = async (req, res) => {
    try {
        const { categoryId } = req.params
        const category = await serviceCategoryModel.findById(categoryId)
        if (!category) {
            return res.status(404).json({ success: false, message: "Category not found" })
        }

        // Block deactivation if active services exist under it
        if (category.isActive) {
            const activeServices = await serviceModel.countDocuments({ category: categoryId, isActive: true })
            if (activeServices > 0) {
                return res.status(400).json({
                    success: false,
                    message: `Cannot deactivate: ${activeServices} active service(s) still belong to this category`,
                })
            }
        }

        category.isActive = !category.isActive
        await category.save()
        return res.status(200).json({
            success: true,
            message: category.isActive ? "Category activated successfully" : "Category deactivated successfully",
            isActive: category.isActive,
        })
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message })
    }
}

// DELETE CATEGORY (hard delete) 
export const adminDeleteCategory = async (req, res) => {
    try {
        const { categoryId } = req.params
        const category = await serviceCategoryModel.findById(categoryId)
        if (!category) {
            return res.status(404).json({ success: false, message: "Category not found" })
        }
        const serviceCount = await serviceModel.countDocuments({ category: categoryId })
        if (serviceCount > 0) {
            return res.status(400).json({
                success: false,
                message: `Cannot delete: ${serviceCount} service(s) still belong to this category`,
            })
        }
        await serviceCategoryModel.findByIdAndDelete(categoryId)
        return res.status(200).json({ success: true, message: "Category permanently deleted" })
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message })
    }
}
