import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import {
  getChatableUsers,
  getChatUserById,
  getConversations,
  getMessages,
} from "../controllers/chat.controller.js";

const router: Router = Router();

// Conversations list — sidebar / inbox
router.get("/conversations", authenticate, getConversations);

// People you can message (for new chat / contact list)
router.get("/users", authenticate, getChatableUsers);
router.get("/users/:userId", authenticate, getChatUserById);

// Message history for an open conversation
router.get("/messages/:userId", authenticate, getMessages);

export default router;
