import { Router } from "express";

import {
  createPublicationRequest,
  extractPublicationFromPdf,
  getMyPublications,
  approvePublication,
  rejectPublication,
  getPendingPublications,
} from "../controllers/publication.controller.js";

import { authenticate, authorize } from "../middleware/auth.js";
import { upload } from "../middleware/upload.js";

const router: Router = Router();

// Extract metadata without storing the file
router.post(
  "/extract",
  authenticate,
  authorize(["STUDENT"]),
  upload.single("file"),
  extractPublicationFromPdf,
);

// User creates request
router.post(
  "/request",
  authenticate,
  authorize(["STUDENT"]),
  upload.single("file"),
  createPublicationRequest,
);

// User views own requests
router.get("/me", authenticate, getMyPublications);
router.get(
  "/pending",
  authenticate,
  authorize(["ADMIN"]),
  getPendingPublications,
);

// Admin approval
router.patch(
  "/:id/approve",
  authenticate,
  authorize(["ADMIN"]),
  approvePublication,
);

// Admin rejection
router.patch(
  "/:id/reject",
  authenticate,
  authorize(["ADMIN"]),
  rejectPublication,
);

export default router;
