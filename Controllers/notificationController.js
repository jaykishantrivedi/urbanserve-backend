import mongoose from "mongoose"
import { notificationModel } from "../models/notificationModel.js"
import { serviceProviderModel } from "../models/serviceProviderModel.js"

export const gotNotification = async (req, res) => {
    try {
        const userId = req.user.userId
        
        const provider = await serviceProviderModel.findOne({user: userId})

        let recipientId
        let recipientType

        if(provider){
            recipientId = provider._id
            recipientType = "provider"
        } else{
            recipientId = userId
            recipientType = "user" 
        }

        const notifications = await notificationModel
            .find({recipient: recipientId, recipientType})
            .sort({createdAt: -1})
            .select("-__v -recipient -recipientType")
            .lean()

        const unreadCount = await notificationModel.countDocuments({
            recipient: recipientId,
            recipientType,
            isRead: false
        })

        return res.status(200).json({
            success: true,
            count: notifications.length,
            unreadCount,
            notifications
        })
        
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        })
    }
}

export const markNotificationAsRead = async (req, res) => {
    try {
        const {notificationId} = req.params
        const userId = req.user.userId

        if(!mongoose.Types.ObjectId.isValid(notificationId)){
            return res.status(400).json({
                success: false,
                message: "Invalid notification Id"
            })
        }

        let recipientId
        let recipientType

        const provider = await serviceProviderModel.findOne({user: userId})
        
        if(provider){
            recipientId = provider._id,
            recipientType = "provider"
        } else {
            recipientId = userId,
            recipientType = "user"
        }

        const notification = await notificationModel.findOne({_id: notificationId, recipient: recipientId, recipientType})

        if(!notification){
            return res.status(404).json({
                success: false,
                message: "Notification not found"
            })
        }

        notification.isRead = true
        await notification.save()

        return res.status(200).json({
            success: true,
            message: "Notification marked as read."
        })

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        })
    }
}

export const markAllNotificationsAsRead = async (req, res) => {
    try {
        const userId = req.user.userId
        
        const provider = await serviceProviderModel.findOne({user: userId})

        let recipientId 
        let recipientType
        
        if(provider){
            recipientId = provider._id,
            recipientType = "provider"
        } else{
            recipientId = userId,
            recipientType = "user"
        }

        await notificationModel.updateMany(
            {
                recipient: recipientId,
                recipientType,
                isRead: false
            },
            {
                $set: {isRead: true}
            }
        )

        return res.status(200).json({
            success: true,
            message: "All notifications marked as read"
        })


    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        })
    }
}
