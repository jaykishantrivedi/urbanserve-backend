import { providerResponseModel } from "../models/providerResponseModel.js"
import { providerServiceModel } from "../models/providerServiceModel.js"
import { serviceProviderModel } from "../models/serviceProviderModel.js"
import { serviceRequestModel } from "../models/serviceRequestModel.js"
import { bookingModel } from "../models/bookingModel.js"
import { sendNotification } from "../utils/sendNotification.js"
import { adminSettingModel } from "../models/adminSettingModel.js"
import mongoose from "mongoose"
import bcrypt from "bcryptjs"

export const sendRequestToProviders = async (req, res) => {
    try {

        const user = req.user.userId
        const { requestId } = req.params
        const { providerId } = req.query || {}

        console.log("RequestId:", requestId)
        console.log("User from token:", user)

        const [serviceRequest, adminSettings] = await Promise.all([
            serviceRequestModel.findOne({
                _id: requestId,
                user,
                status: "open"
            }).populate("user", "name"),
            adminSettingModel.findOne()
        ])
        
        const minBalance = adminSettings ? adminSettings.minimumWalletBalance : 100

        if (!serviceRequest) {
            return res.status(404).json({
                success: false,
                message: "Request not found"
            })
        }


        if (providerId) {

            const provider = await serviceProviderModel.findOne({
                _id: providerId,
                isAvailable: true,
                isDeleted: false,
                isBlocked: false,
                isApproved: true,
                walletBalance: { $gte: minBalance }
            })

            if (!provider) {
                return res.status(404).json({
                    success: false,
                    message: "Provider not found"
                })
            }

            const existing = await providerResponseModel.findOne({
                serviceRequest: requestId,
                provider: providerId
            })

            if (existing) {
                if (existing.status === "pending") {
                    return res.status(400).json({
                        success: false,
                        message: "Request already sent. Waiting for provider to respond."
                    })
                }
                if (existing.status === "accepted") {
                    return res.status(400).json({
                        success: false,
                        message: "This provider has already accepted the request."
                    })
                }
                // status === "declined" — reset so provider gets notified again
                existing.status = "pending"
                existing.message = undefined
                existing.price = null
                existing.respondedAt = undefined
                await existing.save()
            } else {
                await providerResponseModel.create({
                    serviceRequest: requestId,
                    provider: providerId
                })
            }

            await sendNotification(
                "provider",
                providerId,
                "New Service Request",
                `A user - ${serviceRequest.user.name} has sent you a service request`,
                "service_request"
            )

            return res.status(200).json({
                success: true,
                message: "Request sent to provider"
            })
        }


        const providerServices = await providerServiceModel
            .find({
                service: serviceRequest.service,
                isDeleted: false,
                isActive: true
            })
            .populate({
                path: "provider",
                match: {
                    city: serviceRequest.location,
                    isApproved: true,
                    isAvailable: true,
                    isBlocked: false,
                    isDeleted: false,
                    walletBalance: { $gte: minBalance }
                }
            })

        const providers = providerServices
            .filter(ps => ps.provider)
            .map(ps => ps.provider._id)

        if (!providers.length) {
            return res.status(404).json({
                success: false,
                message: "No providers available for this service in your city"
            })
        }

        const existingResponses = await providerResponseModel
            .find({ serviceRequest: requestId })
            .select("provider status")

        // Only block providers with a pending or accepted response
        const blockedProviderIds = existingResponses
            .filter(r => r.status === "pending" || r.status === "accepted")
            .map(r => r.provider.toString())

        // Declined providers can be re-contacted
        const declinedProviderIds = existingResponses
            .filter(r => r.status === "declined")
            .map(r => r.provider.toString())

        const brandNewProviders = providers.filter(
            id => !blockedProviderIds.includes(id.toString()) &&
                  !declinedProviderIds.includes(id.toString())
        )

        const reContactProviders = providers.filter(
            id => declinedProviderIds.includes(id.toString())
        )

        if (!brandNewProviders.length && !reContactProviders.length) {
            return res.status(400).json({
                success: false,
                message: "Request already sent to all available providers"
            })
        }

        if (brandNewProviders.length) {
            const newResponseDocs = brandNewProviders.map(providerId => ({
                serviceRequest: requestId,
                provider: providerId
            }))
            await providerResponseModel.insertMany(newResponseDocs)
        }

        if (reContactProviders.length) {
            await providerResponseModel.updateMany(
                {
                    serviceRequest: requestId,
                    provider: { $in: reContactProviders },
                    status: "declined"
                },
                {
                    $set: { status: "pending", message: null, price: null, respondedAt: null }
                }
            )
        }

        const allContactedProviders = [...brandNewProviders, ...reContactProviders]

        await Promise.all(
            allContactedProviders.map(providerId =>
                sendNotification(
                    "provider",
                    providerId,
                    "New service request",
                    `A new service request is available from - ${serviceRequest.user.name}`,
                    "service_request"
                )
            )
        )

        return res.status(200).json({
            success: true,
            message: "Request sent to providers successfully",
            totalSent: allContactedProviders.length
        })



    } catch (error) {

        return res.status(500).json({
            success: false,
            message: error.message
        })

    }
}

export const getProviderRequests = async (req, res) => {
    // Provider sees requests sent to them.

    try {
        const user = req.user.userId

        const providerDoc = await serviceProviderModel
            .findOne({ user: user, isDeleted: false, isAvailable: true, isBlocked: false, isApproved: true })

        if (!providerDoc) {
            return res.status(404).json({
                success: false,
                message: "Provider profile not found"
            })
        }

        const responses = await providerResponseModel
            .find({ provider: providerDoc._id })
            .populate({
                path: "serviceRequest",
                populate: [
                    {
                        path: "service",
                        select: "serviceName slug"
                    },
                    {
                        path: "user",
                        select: "name phone pfpUrl email"
                    }
                ]
            })
            .sort({ createdAt: -1 })

        return res.status(200).json({
            success: true,
            count: responses.length,
            responses
        })
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        })
    }

}

    export const acceptServiceRequest = async (req, res) => {
        try {
            const user = req.user.userId
            const { responseId } = req.params
            const { message } = req.body
    
            const providerDoc = await serviceProviderModel
            .findOne({user: user, isApproved: true, isBlocked: false,
                isAvailable: true, isDeleted: false
            })
    
            if(!providerDoc){
                return res.status(404).json({
                    success: false,
                    message: "Provider profile not found"
                })
            }
    
            const response = await providerResponseModel
                .findOne({
                    _id: responseId,
                    provider: providerDoc._id
                })
                .populate("serviceRequest", "user service")


        if(!response){
          return res.status(404).json({
            success: false,
            message: "Response not found"
          })
        }

        if(response.status !== "pending"){
            return res.status(400).json({
                success: false,
                message: "Response already processed"
            })
        }

        // Autofill price from the provider's actual service layout
        const ps = await providerServiceModel.findOne({
            provider: providerDoc._id,
            service: response.serviceRequest.service,
            isActive: true,
            isDeleted: false
        })

        if(!ps) {
            return res.status(400).json({
                success: false,
                message: "Provider service pricing not configured"
            })
        }

        response.status = "accepted"
        response.priceType = ps.priceType
        response.price = ps.priceType === "inspection" ? null : ps.price
        if (message) {
            response.message = message.trim()
        }

        await response.save()

        await sendNotification(
            "user",
            response.serviceRequest.user,
            "Provider accepted your Request",
            `A service provider - ${providerDoc.businessName} has accepted your service request`,
            "provider_response"
        )

        return res.status(200).json({
            success: true,
            message: "Service request accepted"
        })
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        })
    }
}

export const rejectServiceRequest = async (req, res) => {
    try {
        const user = req.user.userId
        const { responseId } = req.params

        const providerDoc = await serviceProviderModel.findOne({
            user: user,
            isApproved: true,
            isAvailable: true,
            isBlocked: false,
            isDeleted: false
        })

        if(!providerDoc){
            return res.status(404).json({
                success: false,
                message: "No provider profile found"
            })
        }

        const response = await providerResponseModel.findOne({_id: responseId, provider: providerDoc._id})

        if(!response){
            return res.status(404).json({
                success: false,
                message: "Response not found"
            })
        }

        if(response.status !== "pending"){
            return res.status(400).json({
                success: false,
                message: "Response already processed"
            })
        }

        response.status = "declined"
        await response.save()

        return res.status(200).json({
            success: true,
            message: "Service rejected successfully"
        })
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        })
    }
}

export const declineProviderQuote = async (req, res) => {
    try {
        const user = req.user.userId
        const { responseId } = req.params

        const response = await providerResponseModel.findById(responseId)
            .populate("serviceRequest", "user status")

        if(!response) return res.status(404).json({success: false, message: "Not found"})
        if(response.serviceRequest.user.toString() !== user) return res.status(403).json({success: false, message: "Not authorized"})
        if(response.serviceRequest.status !== "open") return res.status(400).json({success: false, message: "Request closed"})

        response.status = "declined"
        await response.save()

        return res.status(200).json({success: true, message: "Quote declined"})
    } catch(err) {
        return res.status(500).json({success: false, message: err.message})
    }
}

export const getAcceptedResponsesForRequest = async (req, res) => {
    try {
        const user = req.user.userId
        const {requestId} = req.params

        const responses = await providerResponseModel
            .find({serviceRequest: requestId, status: "accepted"})
            .populate({
                path: "provider",
                select: "businessName city rating"
            })
            .populate({
                path: "serviceRequest",
                select: "service message location preferredTime preferredDate status"
            })
            .sort({createdAt: -1})

            if(!responses.length){
                return res.status(404).json({
                    success: false,
                    message: "No providers has accepted this request yet."
                })
            }

            return res.status(200).json({
                success: true,
                count: responses.length,
                responses
            })

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        })
    }
}

export const chooseProvider = async (req, res) => {

    const session = await mongoose.startSession()

    try {

        session.startTransaction()

        const user = req.user.userId
        const { responseId } = req.params

        const response = await providerResponseModel
            .findById(responseId)
            .populate({
                path: "serviceRequest",
                populate: {
                    path: "user",
                    select: "name"
                }
            })
            .session(session)

        if(!response){
            await session.abortTransaction()
            session.endSession()

            return res.status(404).json({
                success: false,
                message: "Response not found"
            })
        }

        console.log(response.serviceRequest.user.toString())
        console.log(user.toString());
        
        if(response.serviceRequest.user._id.toString() !== user.toString()){
            await session.abortTransaction()
            session.endSession()

            return res.status(403).json({
                success: false,
                message: "Not authorized"
            })
        }

        if(response.serviceRequest.status !== "open"){
            await session.abortTransaction()
            session.endSession()

            return res.status(400).json({
                success: false,
                message: "Service request already closed"
            })
        }

        const requestId = response.serviceRequest._id
        
        response.status = "accepted"
        await response.save({session})

        // Generate a 6-digit OTP — plain version returned to user, hashed version stored in DB
        const plainStartOTP = Math.floor(100000 + Math.random() * 900000).toString()
        const hashedStartOTP = await bcrypt.hash(plainStartOTP, 10)
        
        // Calculate OTP valid until: Service Date + 1 extra day (end of that day)
        const otpValidUntil = new Date(response.serviceRequest.preferredDate)
        otpValidUntil.setDate(otpValidUntil.getDate() + 1)
        otpValidUntil.setHours(23, 59, 59, 999)

        let bookingData = {
            user,
            provider: response.provider,
            service: response.serviceRequest.service,
            serviceRequest: requestId,
            location: response.serviceRequest.location,
            serviceDate: response.serviceRequest.preferredDate,
            serviceTime: response.serviceRequest.preferredTime,
            price: response.price,
            priceType: response.priceType,
            hoursWorked: null,
            finalPrice: null,
            startOTP: hashedStartOTP,  // store hash only
            otpValidUntil
        } 

        if(response.priceType === "fixed"){
            bookingData.finalPrice = response.price
        }

        await bookingModel.create([bookingData], {session})

        await sendNotification(
            "provider",
            response.provider,
            "Booking confirmed",
            `Your offer has been accepted by ${response.serviceRequest.user.name} and a booking has been created`,
            "booking_confirmed"
        )

        await providerResponseModel.updateMany(
            {
                serviceRequest: requestId,
                _id: {$ne: responseId}
            },
            {
                status: "declined"
            },
            { session }
        )

        await serviceRequestModel.findByIdAndUpdate(
            requestId, 
            {status: "closed"},
            {session}
        )

        await session.commitTransaction()
        session.endSession()

        return res.status(200).json({
            success: true,
            message: "Provider selected successfully and booking has been successfully created.",
            startOTP: plainStartOTP  // Show user their start OTP once
        })
        
    } catch (error) {

        await session.abortTransaction()
        session.endSession()

        if(error.code === 11000){
            return res.status(400).json({
                success: false,
                message: "Provider already booked for this time slot"
            })
        }

        return res.status(500).json({
            success: false,
            message: error.message
        })
    }
}