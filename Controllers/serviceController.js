
//         let {serviceName, description, category} = req.body

//                 message: "Service name and category are required."


//         const slug = slugify(serviceName, {

//         const existing = await serviceModel.findOne({ slug })
//                     message: "Service already exists but is inactive. Reactivate it instead"

//         const categoryExists = await serviceCategoryModel.findById(category)

//         if(!categoryExists || !categoryExists.isActive){



//             message: "Service created successfully",

//         let {serviceName, description, category} = req.body

//         const service = await serviceModel.findById(id)


//             const newSlug = slugify(serviceName, {

//             const existingSlug = await serviceModel.findOne({slug: newSlug, _id:{ $ne: id }})
//                         message: "Another service with this same name exists but is currently inactive (soft-deleted)."
//                     message: "Another service with this name already exists."

        


//                 const categoryExists = await serviceCategoryModel.findById(category)

//                         message: "Invalid category. Category does not exist."
//                 }else if(!categoryExists.isActive){
//                         message: "Invalid category. Currently is inActive."



//                 message: "Service updated successfully",



//         const service = await serviceModel.findOneAndUpdate(

//                 message: "Service not found or already deleted"

//             message: "Service deleted successfully"




//         const service = await serviceModel.findOneAndUpdate(

//                 message: "Service not found or already active"

//             message: "Service restored successfully",


//         const service = await serviceModel.find({isActive: true}).sort({serviceName: 1}).populate("category", "categoryName slug")
        



//         const service = await serviceModel.findOne({slug, isActive: true})





//         const category = await serviceCategoryModel.findOne({slug, isActive: true})

//         const service = await serviceModel.find({category: category._id, isActive: true}).sort({serviceName: 1})



//         const service = await serviceModel.find({
//             serviceName: {$regex: q, $options: "i"},
//         }).populate("category", "categoryName slug")


//         const service = await serviceModel.find({


import slugify from "slugify"
import { serviceModel } from "../models/serviceModel.js"
import { serviceCategoryModel } from "../models/serviceCategoryModel.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"

export const createService = async (req, res) => {
    try {
        let { serviceName, description, category } = req.body

        if (!serviceName || !category) {
            return res.status(400).json({
                success: false,
                message: "Service name and category are required."
            })
        }

        serviceName = serviceName.trim()

        const slug = slugify(serviceName, {
            lower: true,
            strict: true
        })

        const existing = await serviceModel.findOne({ slug })
        if (existing) {
            if (!existing.isActive) {
                return res.status(400).json({
                    success: false,
                    message: "Service already exists but is inactive. Reactivate it instead"
                })
            }

            return res.status(400).json({
                success: false,
                message: "Service already exists"
            })
        }

        let imageUrl = []
        if (req.files && req.files.length > 0) {
            const uploadPromises = req.files.map((file) => uploadOnCloudinary(file.path));
            const results = await Promise.all(uploadPromises);
            imageUrl = results.filter((url) => url !== null);
        }

        const categoryExists = await serviceCategoryModel.findById(category)

        if (!categoryExists || !categoryExists.isActive) {
            return res.status(400).json({
                success: false,
                message: "Invalid Category"
            })
        }

        const service = new serviceModel({
            serviceName,
            slug,
            description,
            imageUrl: imageUrl || null,
            category
        })

        await service.save()

        res.status(201).json({
            success: true,
            message: "Service created successfully",
            service
        })
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        })
    }
}

export const updateService = async (req, res) => {
    try {
        const { id } = req.params
        let { serviceName, description, category, imageUrl } = req.body

        const service = await serviceModel.findById(id)
        if (!service) {
            return res.status(400).json({
                success: false,
                message: "Service not found"
            })
        }

        if (serviceName) {
            serviceName = serviceName.trim()

            const newSlug = slugify(serviceName, {
                lower: true,
                strict: true
            })

            const existingSlug = await serviceModel.findOne({ slug: newSlug, _id: { $ne: id } })
            if (existingSlug) {
                if (!existingSlug.isActive) {
                    return res.status(400).json({
                        success: false,
                        message: "Another service with this same name exists but is currently inactive (soft-deleted)."
                    })
                }
                return res.status(400).json({
                    success: false,
                    message: "Another service with this name already exists."
                })
            }

            service.serviceName = serviceName
            service.slug = newSlug
        }

        if (description) {
            service.description = description
        }

        if (imageUrl !== undefined || (req.files && req.files.length > 0)) {
            let updatedImages = [];
            if (imageUrl) {
                updatedImages = Array.isArray(imageUrl) ? imageUrl : [imageUrl];
            }
            if (req.files && req.files.length > 0) {
                const uploadPromises = req.files.map((file) => uploadOnCloudinary(file.path));
                const newImageUrls = await Promise.all(uploadPromises);
                const validNewUrls = newImageUrls.filter((url) => url !== null)
                updatedImages = [...updatedImages, ...validNewUrls];
            }
            //Add the final array to our update object
            service.imageUrl = updatedImages
        }

        if (category) {
            const categoryExists = await serviceCategoryModel.findById(category)

            if (!categoryExists) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid category. Category does not exist."
                })
            } else if (!categoryExists.isActive) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid category. Currently is inActive."
                })
            }

            service.category = category
        }

        await service.save()

        res.status(200).json({
            success: true,
            message: "Service updated successfully",
            service
        })
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        })
    }
}

export const deleteService = async (req, res) => {
    try {

        const { id } = req.params

        const service = await serviceModel.findOneAndUpdate(
            { _id: id, isActive: true },
            { isActive: false },
            { new: true }
        )

        if (!service) {
            return res.status(404).json({
                success: false,
                message: "Service not found or already deleted"
            })
        }

        res.status(200).json({
            success: true,
            message: "Service deleted successfully"
        })

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        })
    }
}

export const restoreService = async (req, res) => {
    try {

        const { id } = req.params

        const service = await serviceModel.findOneAndUpdate(
            { _id: id, isActive: false },
            { isActive: true },
            { new: true }
        )

        if (!service) {
            return res.status(404).json({
                success: false,
                message: "Service not found or already active"
            })
        }

        res.status(200).json({
            success: true,
            message: "Service restored successfully",
            service
        })

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        })
    }
}

export const getAllService = async (req, res) => {
    try {
        const service = await serviceModel.find({ isActive: true }).sort({ serviceName: 1 }).populate("category", "categoryName slug")

        res.status(200).json({
            success: true,
            count: service.length,
            service
        })

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        })
    }
}

export const getServiceBySlug = async (req, res) => {
    try {
        const { slug } = req.params

        const service = await serviceModel.findOne({ slug, isActive: true })

        if (!service) {
            return res.status(404).json({
                success: false,
                message: "Service not found"
            })
        }

        res.status(200).json({
            success: true,
            service
        })

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        })
    }
}

export const getServicesByCategories = async (req, res) => {
    try {
        const { slug } = req.params

        const category = await serviceCategoryModel.findOne({ slug, isActive: true })
        if (!category) {
            return res.status(404).json({
                success: false,
                message: "Category not found"
            })
        }

        const service = await serviceModel.find({ category: category._id, isActive: true }).sort({ serviceName: 1 })

        res.status(200).json({
            success: true,
            count: service.length,
            service
        })

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        })
    }
}

export const searchService = async (req, res) => {
    try {
        const { q } = req.query
        const service = await serviceModel.find({
            serviceName: { $regex: q, $options: "i" },
            isActive: true
        }).populate("category", "categoryName slug")

        res.status(200).json({
            success: true,
            count: service.length,
            service
        })
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        })
    }
}

export const getDeletedServices = async (req, res) => {
    try {
        const service = await serviceModel.find({
            isActive: false
        }).sort({ serviceName: 1 })

        res.status(200).json({
            success: true,
            count: service.length,
            service
        })
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        })
    }
}