import Razorpay from "razorpay"
import crypto from "crypto"
import mongoose from "mongoose"
import { serviceProviderModel } from "../models/serviceProviderModel.js"
import { walletTransactionModel } from "../models/walletTransactionModel.js"

export const getWalletDetails = async (req, res) => {
    try {
        const userId = req.user.userId

        const provider = await serviceProviderModel.findOne({ user: userId })
        if (!provider) {
            return res.status(404).json({ success: false, message: "Provider not found" })
        }

        const transactions = await walletTransactionModel
            .find({ provider: provider._id })
            .sort({ createdAt: -1 })
            .limit(50)

        res.status(200).json({
            success: true,
            balance: provider.walletBalance || 0,
            transactions
        })
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message })
    }
}

export const createWalletOrder = async (req, res) => {
    try {
        const userId = req.user.userId
        const { amount } = req.body // Amount in INR

        if (!amount || amount <= 0) {
            return res.status(400).json({ success: false, message: "Valid amount is required" })
        }

        const provider = await serviceProviderModel.findOne({ user: userId })
        if (!provider) {
            return res.status(404).json({ success: false, message: "Provider not found" })
        }

        const razorpay = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID || "test",
            key_secret: process.env.RAZORPAY_SECRET || "test"
        })

        const options = {
            amount: Math.round(amount * 100), // convert to paise
            currency: "INR",
            receipt: `rw_${Date.now()}` // Max 40 chars
        }

        const order = await razorpay.orders.create(options)

        res.status(200).json({
            success: true,
            order
        })

    } catch (error) {
        return res.status(500).json({ 
            success: false, 
            message: error.message || error.error?.description || "Failed to create order"
        })
    }
}

export const verifyWalletPayment = async (req, res) => {
    let session;
    
    try {
        session = await mongoose.startSession();
        session.startTransaction();

        const userId = req.user.userId;
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, amount } = req.body;

        const existingTx = await walletTransactionModel.findOne({ referenceId: razorpay_payment_id });
        if (existingTx) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ success: false, message: "Payment already processed" });
        }

        const secret = process.env.RAZORPAY_SECRET;
        const generatedSignature = crypto
            .createHmac("sha256", secret)
            .update(razorpay_order_id + "|" + razorpay_payment_id)
            .digest("hex");

        if (generatedSignature !== razorpay_signature) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ success: false, message: "Invalid payment signature" });
        }

        const provider = await serviceProviderModel.findOne({ user: userId }).session(session);
        if (!provider) {
            throw new Error("Provider not found");
        }

        provider.walletBalance = (provider.walletBalance || 0) + Number(amount);
        await provider.save({ session });

        const transaction = await walletTransactionModel.create([{
            provider: provider._id,
            type: "credit",
            amount: Number(amount),
            description: "Wallet Recharge",
            referenceId: razorpay_payment_id,
            status: "success"
        }], { session });

        await session.commitTransaction();
        session.endSession();

        res.status(200).json({
            success: true,
            balance: provider.walletBalance,
            transaction: transaction[0]
        });

    } catch (error) {
        if (session) {
            await session.abortTransaction();
            session.endSession();
        }
        return res.status(500).json({ success: false, message: error.message });
    }
};

export const debitWallet = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const userId = req.user.userId;
        const { amount, description } = req.body;

        if (!amount || amount <= 0) {
            return res.status(400).json({ success: false, message: "Valid amount is required" });
        }

        const provider = await serviceProviderModel.findOne({ user: userId }).session(session);
        
        if (!provider) {
            throw new Error("Provider not found");
        }

        if ((provider.walletBalance || 0) < amount) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ success: false, message: "Insufficient wallet balance" });
        }

        provider.walletBalance -= Number(amount);
        await provider.save({ session });

        // Create negative (debit) transaction record
        const transaction = await walletTransactionModel.create([{
            provider: provider._id,
            type: "debit",
            amount: Number(amount),
            description: description || "Wallet Debit",
            status: "success"
        }], { session });

        await session.commitTransaction();
        session.endSession();

        return res.status(200).json({
            success: true,
            message: "Wallet debited successfully",
            balance: provider.walletBalance,
            transaction: transaction[0]
        });

    } catch (error) {
        if (session) {
            await session.abortTransaction();
            session.endSession();
        }
        return res.status(500).json({ success: false, message: error.message });
    }
};