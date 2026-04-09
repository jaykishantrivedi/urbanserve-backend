import express from "express"
import { protect } from "../middleware/authMiddleware.js"
import { userOnly } from "../middleware/userOnly.js"
import { providerOnly } from "../middleware/providerOnly.js"
import { acceptServiceRequest, chooseProvider, getAcceptedResponsesForRequest, getProviderRequests, rejectServiceRequest, sendRequestToProviders, declineProviderQuote } from "../Controllers/providerResponseController.js"
import { isPhoneVerified } from "../middleware/isPhoneVerified.js"

export const providerResponseRoute = express.Router()

providerResponseRoute.post("/sendRequestToProviders/:requestId", protect, userOnly, isPhoneVerified, sendRequestToProviders)
providerResponseRoute.get("/getProviderRequests", protect, providerOnly, getProviderRequests)
providerResponseRoute.put("/acceptServiceRequest/:responseId", protect, providerOnly, acceptServiceRequest)
providerResponseRoute.put("/rejectServiceRequest/:responseId", protect, providerOnly, rejectServiceRequest)
providerResponseRoute.put("/declineProviderQuote/:responseId", protect, userOnly, declineProviderQuote)
providerResponseRoute.get("/getAcceptedResponsesForRequest/:requestId", protect, userOnly, getAcceptedResponsesForRequest)
providerResponseRoute.post("/chooseProvider/:responseId", protect, userOnly, chooseProvider)