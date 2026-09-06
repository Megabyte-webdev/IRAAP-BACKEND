import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import {
  getNotifications,
  getPushPublicKey,
  readAllNotifications,
  readNotification,
} from "../controllers/notification.controller.js";

const router: Router = Router();
router.use(authenticate);

// Public VAPID key only. The private key never leaves the backend.
router.get("/push/public-key", getPushPublicKey);

router.get("/", getNotifications);
router.patch("/:id/read", readNotification);
router.patch("/read-all", readAllNotifications);

export default router;
