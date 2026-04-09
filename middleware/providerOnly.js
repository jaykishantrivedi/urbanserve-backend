export const providerOnly = (req, res, next) => {
    if(req.user.role !== "provider"){
        return res.status(403).json({
            success: false,
            message: "Access denied. Service provider only."
        })
    }
    next()
}