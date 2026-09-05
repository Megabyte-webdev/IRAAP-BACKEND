import { Router } from "express";
import { paystackWebhook } from "../controllers/manager.controller.js";

const router: Router = Router();

// Mount this route with express.json({ verify: captureRawBody }) or express.raw({ type: "application/json" })
// so Paystack's HMAC-SHA512 signature is calculated over the exact request bytes.
router.post("/paystack/webhook", paystackWebhook);

export default router;
