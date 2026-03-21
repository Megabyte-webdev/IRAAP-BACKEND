import { Router } from "express";
import {
  createReviewWithTasks,
  getProjectReviewsWithTasks,
  updateTaskByStudent,
  verifyTaskBySupervisor,
} from "../controllers/review.controller.js";
import { authenticate, authorize } from "../middleware/auth.js";

const router: Router = Router();

router.get(
  "/:projectId",
  authenticate,
  authorize(["STUDENT", "SUPERVISOR", "ADMIN"]),
  getProjectReviewsWithTasks,
);

router.post(
  "/",
  authenticate,
  authorize(["SUPERVISOR"]),
  createReviewWithTasks,
);

router.patch(
  "/tasks/:taskId",
  authenticate,
  authorize(["STUDENT"]),
  updateTaskByStudent,
);

router.patch(
  "/tasks/:taskId/verify",
  authenticate,
  authorize(["SUPERVISOR"]),
  verifyTaskBySupervisor,
);

export default router;
