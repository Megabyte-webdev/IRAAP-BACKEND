import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth.js";
import { getScheduledMeetings } from "../controllers/chat.controller.js";

const router: Router = Router();

// Conversations list — sidebar / inbox
router.get(
  "/",
  authenticate,
  authorize(["STUDENT", "SUPERVISOR"]),
  getScheduledMeetings,
);

export default router;
