export const isPhoneVerified = (req, res, next) => {
    if(!req.user.isPhoneVerified){
        return res.status(400).json({
            success: false,
            message: "Please verify your phone number first"
        })
    }
    next()
}