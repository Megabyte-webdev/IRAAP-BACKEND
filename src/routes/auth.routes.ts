import { Router } from "express";
import { login, logout, refreshToken, register, resendOtp, verifyOtp, forgotPassword, resetPassword, changePassword } from "../controllers/auth.controller.js";
import { authenticate } from "../middleware/auth.js";

const router: Router = Router();
router.post("/register", register);
router.post("/login", login);
router.post("/verify-otp", verifyOtp);
router.post("/resend-otp", resendOtp);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.post("/change-password", authenticate, changePassword);
router.post("/refresh-token", refreshToken);
router.post("/logout", logout);
export default router;
