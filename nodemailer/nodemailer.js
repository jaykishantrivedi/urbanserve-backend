import nodemailer from "nodemailer"
import dotenv from "dotenv"
import { otpEmailTemplate} from "../emails/OTPTemplate.js"
import { resetPasswordTemplate } from "../emails/resetPasswordTemplate.js"

dotenv.config()

const transporter = nodemailer.createTransport({
    service:"Gmail",
    port: 465,
    secure: true,
    auth: {
        user: process.env.GMAIL,
        pass: process.env.NODEMAILER_PASS
    }
})

export const sendOTPMail = async (receiver, otp, name) => {
    await transporter.sendMail({
        from:`"UrbanAssist"<${process.env.GMAIL}>`,
        to:receiver,
        subject:"Verify your email - OTP",
        html: otpEmailTemplate(otp,name)
    })
}

export const sendResetPasswordEmail = async (receiver, resetLink, name) => {
  await transporter.sendMail({
    from: `"UrbanAssist" <${process.env.GMAIL}>`,
    to: receiver,
    subject: "Reset your password",
    html: resetPasswordTemplate(resetLink, name),
  })
}

export const sendEmailChangeOtpMail = async (receiver, otp, name) => {
  await transporter.sendMail({
    from: `"UrbanAssist" <${process.env.GMAIL}>`,
    to: receiver,
    subject: "Confirm your new email address - OTP",
    html: otpEmailTemplate(otp, name)
  })
}