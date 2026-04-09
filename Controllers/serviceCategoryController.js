import { serviceCategoryModel } from "../models/serviceCategoryModel.js"
import slugify from "slugify"
import { serviceModel } from "../models/serviceModel.js"

export const createCategory = async (req, res) => {
    try {
        let { categoryName, description, iconUrl } = req.body

        if (!categoryName) {
            return res.status(500).json({
                success: false,
                message: "Category name is required"
            })
        }

        categoryName = categoryName.trim()

        const slug = slugify(categoryName, {
            lower: true,
            strict: true
        })

        const existing = await serviceCategoryModel.findOne({ slug })
        if (existing) {
            if(!existing.isActive){
                return res.status(400).json({
                    success: false,
                    message: "Category already exists but is inactive. Reactivate it instead."
                })
            }

            return res.status(500).json({
                success: false,
                message: "Category already exists"
            })
        }

        const category = new serviceCategoryModel({
            categoryName,
            slug,
            description,
            iconUrl
        })

        await category.save()

        res.status(200).json({
            success: true,
            message: "Category created successfully"
        })

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        })
    }
}

export const updateCategory = async (req, res) => {
    try {
        const { id } = req.params
        let { categoryName, description, iconUrl } = req.body

        const category = await serviceCategoryModel.findById(id)
        if (!category) {
            return res.status(404).json({
                success: false,
                message: "Category not found"
            })
        }

        if (categoryName) {

            categoryName = categoryName.trim()

            const newSlug = slugify(categoryName, {
                lower: true,
                strict: true
            })

            const existingSlug = await serviceCategoryModel.findOne({
                slug: newSlug,
                _id: { $ne: id }
            })

            if (existingSlug) {
                return res.status(400).json({
                    success: false,
                    message: "Another category with this name already exists"
                });
            }

            category.categoryName = categoryName;
            category.slug = newSlug;
        }

        if (description) {
            category.description = description;
        }

        if (iconUrl) {
            category.iconUrl = iconUrl;
        }

        await category.save()

        res.status(200).json({
            success: true,
            message: "Category updated successfully",
        })
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        })
    }
}

export const deleteCategory = async (req, res) => {
    try {
        const { id } = req.params

        const category = await serviceCategoryModel.findById(id)
        if(!category){
            return res.status(404).json({
                success: false,
                message: "Category not found"
            })
        } 
        
        const serviceExist = await serviceModel.findOne({ category: id, isActive: true })
        if(serviceExist){
            return res.status(400).json({
                success: false,
                message: "Cannot delete category because services exist under it"
            })
        }

        category.isActive = false
        await  category.save()

        res.status(200).json({
            success: true,
            message: "Category deleted successfully"
        })
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        })
    }
}

export const getAllCategories = async (req, res) => {
    try {
        const categories = await serviceCategoryModel.find({isActive: true}).sort({categoryName: 1})

        res.status(200).json({
            success: true,
            count: categories.length,
            categories
        })
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        })
    }
}

export const getCategoryBySlug = async (req, res) => {
    try {
        const {slug} = req.params

        const category = await serviceCategoryModel.findOne({slug, isActive: true})

        if(!category){
            return res.status(404).json({
                success: false,
                message: "Category not found"
            })
        }

        res.status(200).json({
            success: true,
            category
        })
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        })
    }
}

export const getAllCategoriesAdmin = async (req, res) => {
    try {
        const categories = await (await serviceCategoryModel.find()).toSorted({categoryName: 1})

        res.status(200).json({
            success: true,
            count: categories.length,
            categories
        })
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        })
    }
}
