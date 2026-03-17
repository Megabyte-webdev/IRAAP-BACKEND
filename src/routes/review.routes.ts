import { Router } from "express";
import {
  generateReview,
  getReviewsForProject,
} from "../controllers/review.controller.js";
import { authenticate, authorize } from "../middleware/auth.js";

const router: Router = Router();

router.get("/", getReviewsForProject);
router.post(
  "/generate",
  authenticate,
  authorize(["SUPERVISOR"]),
  generateReview,
);

export default router;
