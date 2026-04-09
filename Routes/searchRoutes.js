import express from "express"
import { searchProviders, searchCities } from "../Controllers/searchController.js"

export const searchRouter = express.Router()

// GET /api/search?service=plumber&city=surat
searchRouter.get("/providers", searchProviders)

searchRouter.get("/cities", searchCities)