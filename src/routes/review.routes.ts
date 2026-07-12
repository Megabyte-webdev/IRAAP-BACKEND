import { Router } from "express";
import {
  createReviewWithTasks,
  deleteReview,
  deleteTask,
  getProjectReviewsWithTasks,
  submitRevisionForReview,
  updateAllReviewTasksByStudent,
  verifyReviewRoundBySupervisor,
} from "../controllers/review.controller.js";
import { authenticate, authorize } from "../middleware/auth.js";
import { upload } from "../middleware/upload.js";

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

router.post(
  "/:reviewId/submit",
  authenticate,
  authorize(["STUDENT"]),
  upload.single("file"),
  submitRevisionForReview,
);

router.patch(
  "/:reviewId",
  authenticate,
  authorize(["STUDENT"]),
  updateAllReviewTasksByStudent,
);

router.patch(
  "/:reviewId/approve",
  authenticate,
  authorize(["SUPERVISOR"]),
  verifyReviewRoundBySupervisor,
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
