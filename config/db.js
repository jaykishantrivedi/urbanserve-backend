import mongoose from "mongoose"
import dotenv from "dotenv"

dotenv.config()

export const connectDb = async() => {
    try {
        await mongoose.connect(process.env.MONGODB_URL,  {
            autoIndex: true
        })
        
    } catch (error) {
        console.log("Db.error: ",error);
        process.exit(1)
    }
}