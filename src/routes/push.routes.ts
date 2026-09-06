import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import {
  subscribeToPush,
  unsubscribeFromPush,
} from "../controllers/notification.controller.js";

const router: Router = Router();
router.use(authenticate);

router.post("/subscribe", subscribeToPush);
router.delete("/subscribe", unsubscribeFromPush);

export default router;
