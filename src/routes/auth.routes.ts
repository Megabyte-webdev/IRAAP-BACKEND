import { Router } from "express";
import { login, refreshToken } from "../controllers/auth.controller.js";

const router: Router = Router();
router.post("/login", login);
router.post("/refresh-token", refreshToken);
export default router;
