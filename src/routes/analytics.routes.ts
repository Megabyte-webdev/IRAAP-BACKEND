import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth.js";
import { getAdvancedAnalytics } from "../controllers/analytics.controller.js";
const router: Router = Router();
router.get("/", authenticate, authorize(["ADMIN"]), getAdvancedAnalytics);
export default router;
