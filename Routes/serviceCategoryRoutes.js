import express from "express"
import { protect } from "../middleware/authMiddleware.js"
import { adminOnly } from "../middleware/adminOnly.js"
import { createCategory, deleteCategory, getAllCategories, getAllCategoriesAdmin, getCategoryBySlug, updateCategory } from "../Controllers/serviceCategoryController.js"

export const serviceCategoryRouter = express.Router()

serviceCategoryRouter.post("/createCategory",protect, adminOnly, createCategory)
serviceCategoryRouter.put("/updateCategory/:id", protect, adminOnly, updateCategory)
serviceCategoryRouter.delete("/deleteCategory/:id", protect, adminOnly, deleteCategory)
serviceCategoryRouter.get("/getAllCategoriesAdmin", protect, adminOnly, getAllCategoriesAdmin)

serviceCategoryRouter.get("/getAllCategories", getAllCategories)
serviceCategoryRouter.get("/getCategoryBySlug/:slug", getCategoryBySlug)