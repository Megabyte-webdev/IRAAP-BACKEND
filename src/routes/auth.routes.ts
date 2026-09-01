import { Router } from "express";
import { login, logout, refreshToken, register, resendOtp, verifyOtp } from "../controllers/auth.controller.js";

const router: Router = Router();
router.post("/register", register);
router.post("/login", login);
router.post("/verify-otp", verifyOtp);
router.post("/resend-otp", resendOtp);
router.post("/refresh-token", refreshToken);
router.post("/logout", logout);
export default router;
