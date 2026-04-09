import { serviceProviderModel } from "../models/serviceProviderModel.js"
import { userModel } from "../models/userModel.js";
import { createAdminAlert } from "./adminAlertController.js"

export const createServiceProvider = async (req, res) => {
    try {

        const user = req.user.userId;
        console.log(user);

        const { businessName, description, experience, city, address, profileImage, serviceRadius, latitude, longitude, documents, gallery, availability } = req.body;

        const existing = await serviceProviderModel.findOne({ user });

        if (existing) {
            return res.status(400).json({
                success: false,
                message: "Provider profile already exists."
            });
        }

        const provider = await serviceProviderModel.create({
            user,
            businessName,
            description,
            experience,
            city,
            address,
            profileImage,
            serviceRadius,
            latitude,
            longitude,
            documents,
            gallery,
            availability
        });

        res.status(201).json({
            success: true,
            provider
        });

        // Fire admin alert (non-blocking — intentionally after response)
        createAdminAlert({
            type: "new_provider_pending",
            title: "New Provider Pending Approval",
            message: `${businessName} from ${city} has registered and is awaiting approval.`,
            refId: provider._id,
            refModel: "ServiceProvider"
        })

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};


export const getServiceProviderProfile = async (req, res) => {
    try {

        const user = req.user.userId

        const profile = await serviceProviderModel.findOne({ user }).populate("user", "name email")

        if (!profile) {
            return res.status(404).json({
                success: false,
                message: "Provider profile not found"
            })
        }

        res.status(200).json({
            success: true,
            profile
        })
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        })
    }
}

export const updateServiceProviderProfile = async (req, res) => {
    try {

        const user = req.user.userId

        const allowedFields = [
            "businessName",
            "description",
            "experience",
            "city",
            "address",
            "profileImage",
            "serviceRadius",
            "isAvailable"
        ]

        const updates = {}

        allowedFields.forEach(field => {
            if (field in req.body) {
                updates[field] = req.body[field]
            }
        })

        const profile = await serviceProviderModel.findOneAndUpdate(
            { user },
            updates,
            { new: true }
        )

        if (!profile) {
            return res.status(404).json({
                success: false,
                message: "Provider profile not found."
            })
        }

        res.status(200).json({
            success: true,
            profile
        })

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
}

export const deleteServiceProviderProfile = async (req, res) => {
    try {
        const userId = req.user.userId
        console.log(userId);


        const profile = await serviceProviderModel.findOneAndUpdate({ user: userId, isDeleted: false }, { isDeleted: true }, { new: true })

        if (!profile) {
            return res.status(404).json({
                success: false,
                message: "Provider profile not found."
            })
        }

        res.status(200).json({
            success: true,
            message: "Provider deleted successfully"
        })

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        })
    }
}

export const getAllServiceProviders = async (req, res) => {
    try {
        const providers = await serviceProviderModel.find({
            isApproved: true, isBlocked: false, isDeleted: true
        }).sort({ businessName: 1 })


        res.status(200).json({
            success: true,
            count: providers.length,
            providers
        })
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        })
    }
}

export const getServiceProviderById = async (req, res) => {
    try {
        const { id } = req.params

        const provider = await serviceProviderModel.findById(id)

        if (!provider) {
            return res.status(404).json({
                success: false,
                message: "Provider not found"
            })
        }

        if (provider.isBlocked || !provider.isApproved || provider.isDeleted) {
            return res.status(400).json({
                success: false,
                message: "Provider not available."
            })
        }

        res.status(200).json({
            success: true,
            provider
        })
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
}

export const searchServiceProviderByCity = async (req, res) => {
    try {
        let { q } = req.query

        const provider = await serviceProviderModel.find({
            city: { $regex: q, $options: "i" },
            isApproved: true,
            isBlocked: false,
            isDeleted: false
        }).populate("user", "name email")

        res.status(200).json({
            success: true,
            count: provider.length,
            provider
        })
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
}

export const approveServiceProvider = async (req, res) => {
    try {

        const { id } = req.params;

        const provider = await serviceProviderModel.findById(id);

        if (!provider) {
            return res.status(404).json({
                success: false,
                message: "Provider not found"
            });
        }

        if (provider.isApproved) {
            return res.status(400).json({
                success: false,
                message: "Provider already approved"
            });
        }

        provider.isApproved = true;
        await provider.save();

        await userModel.findByIdAndUpdate(
            provider.user,
            { role: "provider" },
            { new: true }
        );

        res.status(200).json({
            success: true,
            message: "Service Provider successfully approved",
            provider
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        })
    }
}

export const blockServiceProvider = async (req, res) => {
    try {

        const { id } = req.params;

        const provider = await serviceProviderModel.findById(id);

        if (!provider) {
            return res.status(404).json({
                success: false,
                message: "Provider not found"
            });
        }

        if (provider.isBlocked) {
            return res.status(400).json({
                success: false,
                message: "Provider already blocked"
            });
        }

        provider.isBlocked = true;
        await provider.save();

        res.status(200).json({
            success: true,
            message: "Service Provider successfully blocked",
            provider
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
}

export const unblockServiceProvider = async (req, res) => {
    try {

        const { id } = req.params;

        const provider = await serviceProviderModel.findById(id);

        if (!provider) {
            return res.status(404).json({
                success: false,
                message: "Provider not found"
            });
        }

        if (!provider.isBlocked) {
            return res.status(400).json({
                success: false,
                message: "Provider is not blocked"
            });
        }

        provider.isBlocked = false;
        await provider.save();

        res.status(200).json({
            success: true,
            message: "Service Provider successfully unblocked",
            provider
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
}

export const adminDeleteServiceProvider = async (req, res) => {
    try {

        const { id } = req.params;

        const provider = await serviceProviderModel.findById(id);

        if (!provider) {
            return res.status(404).json({
                success: false,
                message: "Provider not found"
            });
        }

        if (provider.isDeleted) {
            return res.status(400).json({
                success: false,
                message: "Provider already deleted"
            });
        }

        provider.isDeleted = true;
        await provider.save();

        res.status(200).json({
            success: true,
            message: "Service Provider successfully deleted",
            provider
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
}

export const adminRestoreServiceProvider = async (req, res) => {
    try {

        const { id } = req.params;

        const provider = await serviceProviderModel.findById(id);

        if (!provider) {
            return res.status(404).json({
                success: false,
                message: "Provider not found"
            });
        }

        if (!provider.isDeleted) {
            return res.status(400).json({
                success: false,
                message: "Provider is not deleted"
            });
        }

        provider.isDeleted = false;
        await provider.save();

        res.status(200).json({
            success: true,
            message: "Service Provider successfully restored",
            provider
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
}