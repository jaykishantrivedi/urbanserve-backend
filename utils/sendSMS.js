import dotenv from "dotenv"
import twilio from "twilio"

dotenv.config()

const client = twilio(process.env.ACCOUNT_SID_TWILIO, process.env.AUTH_TOKEN_TWILIO)

export const sendSMS = async (phone, otp) => {
    const msgOptions = {
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phone,
        body: `Your OTP is ${otp}`
    }
    try {
        await client.messages.create(msgOptions)
    } catch (error) {
        console.error(error)
        throw new Error("SMS sending failed")
    }
}

