import express from "express"
import { protect } from "../middleware/authMiddleware.js"
import { getWalletDetails, createWalletOrder, verifyWalletPayment, debitWallet } from "../Controllers/walletController.js"

const router = express.Router()

router.get("/", protect, getWalletDetails)
router.post("/add-money/create-order", protect, createWalletOrder)
router.post("/add-money/verify", protect, verifyWalletPayment)
router.post("/debit", protect, debitWallet)

export default router
