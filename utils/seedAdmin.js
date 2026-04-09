import mongoose from "mongoose"
import dotenv from "dotenv"
import bcrypt from "bcryptjs"
import { userModel } from "../models/userModel.js"

dotenv.config()

const createAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URL)
        console.log("MongoDB connected");
        
        const existingAdmin = await userModel.findOne({role:"admin"})
        if(existingAdmin){
            console.log("Admin already exists");
            process.exit()
        }

        const hashedPassword = await bcrypt.hash("Admin@123",10)

        const admin = new userModel({
            name : "Super Admin",
            email : "admin@gmail.com",
            password : hashedPassword,
            role : "admin",
            isVerified : true
        })

        await admin.save()
        console.log("Admin created successfully : ", admin);
        process.exit()
        
    } catch (error) {
        console.log("Error creating admin : ", error.message);
        process.exit(1)
    }
}

createAdmin()