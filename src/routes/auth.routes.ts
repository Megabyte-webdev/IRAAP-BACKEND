import { Router } from "express";
import { login, refreshToken, register } from "../controllers/auth.controller.js";

const router: Router = Router();
router.post("/register", register);
router.post("/login", login);
router.post("/refresh-token", refreshToken);
export default router;
