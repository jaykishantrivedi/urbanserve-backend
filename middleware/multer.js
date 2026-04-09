import multer from "multer"
import fs from "fs";
// Create the upload folder automatically if it doesn't exist
const uploadDir = "./upload";
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir)
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + "-" + file.originalname);
    },

})
const upload = multer({
    storage,
    limits: {
        fileSize: 5 * 1024 * 1024
    }
})
export default upload;