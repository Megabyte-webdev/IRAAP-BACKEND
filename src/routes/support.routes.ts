import { Router } from "express";
import { authenticate, authorize, optionalAuthenticate } from "../middleware/auth.js";
import { createSupportTicket, getSupportTickets, updateSupportTicket } from "../controllers/support.controller.js";

const router: Router = Router();
router.post("/", optionalAuthenticate, createSupportTicket);
router.get("/", authenticate, authorize(["ADMIN"]), getSupportTickets);
router.patch("/:id", authenticate, authorize(["ADMIN"]), updateSupportTicket);
export default router;
