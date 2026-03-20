import { Router } from "express";
import {
  getSupervisorProjects,
  getSupervisorStats,
  updateProjectStatus,
} from "../controllers/supervisor.controller.js";
import { authenticate, authorize } from "../middleware/auth.js";
const router: Router = Router();

router.get(
  "/stats",
  authenticate,
  authorize(["SUPERVISOR"]),
  getSupervisorStats,
);

router.get(
  "/projects",
  authenticate,
  authorize(["SUPERVISOR"]),
  getSupervisorProjects,
);

router.patch(
  "/projects/:id/status",
  authenticate,
  authorize(["SUPERVISOR"]),
  updateProjectStatus,
);
export default router;
