import { serviceRequestModel } from "../models/serviceRequestModel.js"
import { serviceModel } from "../models/serviceModel.js"

export const createServiceRequest = async (req, res) => {
    try {
        const user = req.user.userId
        const { service, message, location, address, preferredDate, preferredTime } = req.body

        const dateRegex = /^\d{4}-\d{2}-\d{2}$/
        const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/

        if (!service || !location || !address) {
            return res.status(400).json({
                success: false,
                message: "Service, Address and Location are required"
            })
        }

        const serviceExists = await serviceModel.findById(service)

        if (!serviceExists) {
            return res.status(404).json({
                success: false,
                message: "Service not found"
            })
        }

        if (address.length > 200) {
            return res.status(400).json({
                success: false,
                message: "Address too long. Maximum character allowed are 200"
            })
        }

        if (preferredDate) {
            if (!dateRegex.test(preferredDate)) {
                return res.status(400).json({
                    success: false,
                    message: "Date must be in YYYY-MM-DD format"
                })
            }

            const date = new Date(preferredDate)
            const today = new Date()
            today.setHours(0, 0, 0, 0)

            if (date < today) {
                return res.status(400).json({
                    success: false,
                    message: "Preferred Date cannot be in the past"
                })
            }
        }

        if (preferredTime) {
            if (!timeRegex.test(preferredTime)) {
                return res.status(400).json({
                    success: false,
                    message: "Time must be in HH:MM 24 hour format"
                })
            }
        }

        if (preferredDate && preferredTime) {
            const dateTime = new Date(`${preferredDate}T${preferredTime}`)

            if (dateTime < new Date()) {
                return res.status(400).json({
                    success: false,
                    message: "Preferred date and time cannot be in the past"
                })
            }
        }

        if (message && message.length > 500) {
            return res.status(400).json({
                success: false,
                message: "Message too long"
            })
        }

        const serviceRequest = await serviceRequestModel.create({
            user: user,
            service,
            message,
            location,
            address,
            preferredDate,
            preferredTime
        })

        res.status(201).json({
            success: true,
            message: "serviceRequest created.",
            serviceRequest
        })
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        })
    }
}

export const getAllServiceRequest = async (req, res) => {
    try {
        const user = req.user.userId

        const requests = await serviceRequestModel
            .find({ user })
            .populate("service", "serviceName slug")
            .sort({ createdAt: -1 })

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let hasModified = false;
        
        for (let request of requests) {
            if (request.status === "open" && request.preferredDate) {
                const pDate = new Date(request.preferredDate);
                
                // If it's the day after the service date
                if (pDate < today) {
                    request.status = "cancelled";
                    await request.save();
                    
                    // Also decline any pending/accepted responses for this request
                    const { providerResponseModel } = await import("../models/providerResponseModel.js");
                    const { sendNotification } = await import("../utils/sendNotification.js");
                    
                    const responses = await providerResponseModel.find({ 
                        serviceRequest: request._id,
                        status: { $in: ["pending", "accepted"] }
                    });

                    for (let resp of responses) {
                        resp.status = "declined";
                        await resp.save();
                        
                        await sendNotification(
                            "provider",
                            resp.provider,
                            "Request Expired",
                            `The service request for ${request.service.serviceName} has expired and was automatically cancelled.`,
                            "provider_response"
                        );
                    }
                    hasModified = true;
                }
            }
        }

        res.status(200).json({
            success: true,
            count: requests.length,
            requests
        })

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        })
    }
}

export const getServiceRequestById = async (req, res) => {
    try {
        const user = req.user.userId
        const { id } = req.params

        const serviceRequest = await serviceRequestModel
            .findOne({ user, _id: id })
            .populate("service", "serviceName slug")

        if (!serviceRequest) {
            return res.status(404).json({
                success: false,
                message: "Service request not found"
            })
        }

        res.status(200).json({
            success: true,
            serviceRequest
        })
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        })
    }
}

export const updateServiceRequest = async (req, res) => {
    try {
        const user = req.user.userId
        const { id } = req.params
        const { message, location, address, preferredDate, preferredTime } = req.body

        const dateRegex = /^\d{4}-\d{2}-\d{2}$/
        const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/

        const request = await serviceRequestModel.findOne({ user, _id: id })
        if (!request) {
            return res.status(404).json({
                success: false,
                message: "Service request not found"
            })
        }

        if (request.status !== "open") {
            return res.status(400).json({
                success: false,
                message: "Only open requests can be updated."
            })
        }

        if (preferredDate) {
            if (!dateRegex.test(preferredDate)) {
                return res.status(400).json({
                    success: false,
                    message: "Date must be in YYYY-MM-DD format"
                })
            }

            const date = new Date(preferredDate)
            const today = new Date()
            today.setHours(0, 0, 0, 0)

            if (date < today) {
                return res.status(400).json({
                    success: false,
                    message: "Preferred date cannot be in the past"
                })
            }
        }

        if (preferredTime && !timeRegex.test(preferredTime)) {
            return res.status(400).json({
                success: false,
                message: "Time must be in HH:MM 24-hour format"
            })
        }

        if (preferredDate && preferredTime) {
            const dateTime = new Date(`${preferredDate}T${preferredTime}`)
            if (dateTime < new Date()) {
                return res.status(400).json({
                    success: false,
                    message: "Preferred date and time cannot be in the past"
                })
            }
        }

        if (message) {
            if (message.length > 500) {
                return res.status(400).json({
                    success: false,
                    message: "Message too long"
                })
            }
            request.message = message.trim()
        }

        if(address){
            if (address.length > 200) {
                return res.status(400).json({
                    success: false,
                    message: "Address too long. Maximum character allowed are 200"
                })
            }
            request.address = address.trim()
        }

        if (location) request.location = location.trim()
        if (preferredDate) request.preferredDate = preferredDate
        if (preferredTime) request.preferredTime = preferredTime

        await request.save()

        res.status(200).json({
            success: true,
            message: "Service request updated successfully",
            serviceRequest: request
        })

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        })
    }
}

export const cancelServiceRequest = async (req, res) => {
    try {
        const user = req.user.userId
        const {id} = req.params

        const request = await serviceRequestModel.findOne({user, _id:id})
        if(!request){
            return res.status(404).json({
                success: false,
                message: "Service Request not found"
            })
        }

        if(request.status === "cancelled"){
            return res.status(400).json({
                success: false,
                message: "Request already cancelled!" 
            })
        }

        if(request.status === "completed"){
            return res.status(400).json({
                success: false,
                message: "Completed request cannot be cancelled!" 
            })
        }

        request.status = "cancelled"
        await request.save()

        res.status(200).json({
            success: true,
            message: "Service request cancelled"
        })
        
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        })
    }
}