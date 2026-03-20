import { Router } from "express";
import {
  getSupervisorProjects,
  getSupervisorStats,
} from "../controllers/supervisor.controller.js";
import { authenticate, authorize } from "../middleware/auth.js";
const router: Router = Router();

router.get("/stats", getSupervisorStats);

router.get(
  "/projects",
  authenticate,
  authorize(["SUPERVISOR"]),
  getSupervisorProjects,
);
export default router;
