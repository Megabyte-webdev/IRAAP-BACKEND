import { Router } from "express";
import {
  createReviewWithTasks,
  deleteReview,
  deleteTask,
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

router.delete(
  "/tasks/:taskId",
  authenticate,
  authorize(["SUPERVISOR", "ADMIN"]),
  deleteTask,
);

router.delete(
  "/:reviewId",
  authenticate,
  authorize(["SUPERVISOR", "ADMIN"]),
  deleteReview,
);

export default router;
