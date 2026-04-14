import { serviceModel } from "../models/serviceModel.js"
import { serviceProviderModel } from "../models/serviceProviderModel.js"
import { providerServiceModel } from "../models/providerServiceModel.js"
import { adminSettingModel } from "../models/adminSettingModel.js"

/**
 * GET /api/search?service=plumber&city=surat
 *
 * Flow:
 * 1. Find all services whose name matches ?service (regex, case-insensitive)
 * 2. Find all active ProviderService docs for those services
 * 3. Populate each ProviderService's provider and filter by city + approved/available/not blocked/not deleted
 * 4. Return the list of matching providers with their service details
 */
export const searchProviders = async (req, res) => {
    try {
        const { service, city, minPrice, maxPrice, priceType, minRating, experience, sort } = req.query

        if (!service && !city) {
            return res.status(400).json({
                success: false,
                message: "Please provide at least a service name or city to search"
            })
        }

        let serviceIds = []

        if (service) {
            const matchedServices = await serviceModel.find({
                $or: [
                    { slug: service },                                   // exact slug match (e.g. "hair-cutting")
                    { serviceName: { $regex: service, $options: "i" } }  // fuzzy name match (e.g. "Hair Cutting")
                ],
                isActive: true
            }).select("_id").lean()

            if (!matchedServices.length) {
                return res.status(200).json({
                    success: true,
                    count: 0,
                    results: [],
                    message: "No services found matching your search"
                })
            }

            serviceIds = matchedServices.map(s => s._id)
        }

        const providerServiceQuery = {
            isActive: true,
            isDeleted: false
        }

        if (serviceIds.length) {
            providerServiceQuery.service = { $in: serviceIds }
        }

        if (priceType) {
            providerServiceQuery.priceType = priceType.toLowerCase()
        }

        if (minPrice || maxPrice) {
            providerServiceQuery.price = {}
            if (minPrice) providerServiceQuery.price.$gte = Number(minPrice)
            if (maxPrice) providerServiceQuery.price.$lte = Number(maxPrice)
        }

        if (experience) {
            providerServiceQuery.experience = { $gte: Number(experience) }
        }

        const adminSettings = await adminSettingModel.findOne()
        const minBalance = adminSettings ? adminSettings.minimumWalletBalance : 100

        const providerMatch = {
            isApproved: true,
            isAvailable: true,
            isBlocked: false,
            isDeleted: false,
            walletBalance: { $gte: minBalance },
            ...(city && { city: { $regex: city, $options: "i" } })
        }

        if (minRating) {
            providerMatch.rating = { $gte: Number(minRating) }
        }

        const providerServices = await providerServiceModel
            .find(providerServiceQuery)
            .populate({
                path: "provider",
                match: providerMatch,
                select: "businessName description city address profileImage rating totalReviews experience workingHours"
            })
            .populate({
                path: "service",
                select: "serviceName slug description"
            })
            .lean()

        let results = providerServices
            .filter(ps => ps.provider !== null)
            .map(ps => ({
                providerServiceId: ps._id,
                price: ps.price,
                priceType: ps.priceType,
                experience: ps.experience,
                description: ps.description,
                service: ps.service,
                provider: ps.provider
            }))

        if (sort === "price_low") {
            results.sort((a, b) => Number(a.price || 0) - Number(b.price || 0))
        } else if (sort === "price_high") {
            results.sort((a, b) => Number(b.price || 0) - Number(a.price || 0))
        } else if (sort === "rating") {
            results.sort((a, b) => Number(b.provider.rating || 0) - Number(a.provider.rating || 0))
        } else {
            results.sort((a, b) => {
                const scoreA = Number(a.provider.rating || 0) * Number(a.provider.totalReviews || 0)
                const scoreB = Number(b.provider.rating || 0) * Number(b.provider.totalReviews || 0)
                return scoreB - scoreA
            })
        }

        return res.status(200).json({
            success: true,
            count: results.length,
            results
        })

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        })
    }
}

/**
 * GET /api/search/cities?q=mum
 *
 * Returns distinct city names from approved, active providers
 * that match the search query — so we only suggest cities
 * where providers actually exist.
 */
export const searchCities = async (req, res) => {
    try {
        const { q } = req.query

        if (!q || q.trim().length < 1) {
            return res.status(400).json({
                success: false,
                message: "Please provide a search query"
            })
        }

        const adminSettings = await adminSettingModel.findOne()
        const minBalance = adminSettings ? adminSettings.minimumWalletBalance : 100

        const cities = await serviceProviderModel.distinct("city", {
            city: { $regex: q.trim(), $options: "i" },
            isApproved: true,
            isAvailable: true,
            isBlocked: false,
            isDeleted: false,
            walletBalance: { $gte: minBalance }
        })

        // Sort alphabetically and limit to 8 suggestions
        const sorted = cities.sort().slice(0, 8)

        return res.status(200).json({
            success: true,
            cities: sorted
        })

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        })
    }
}