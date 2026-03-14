import { Router } from "express";
import {
  getPendingProjects,
  getStudentSubmissions,
  submitProject,
} from "../controllers/project.controller.js";
import { authenticate, authorize } from "../middleware/auth.js";
import { upload } from "../middleware/upload.js";

const router: Router = Router();

// Student only: Submit a new research project [cite: 20, 26]
router.post(
  "/submit",
  authenticate,
  authorize(["STUDENT"]),
  upload.single("file"),
  submitProject,
);
//student view their submissions
router.get(
  "/submissions",
  authenticate,
  authorize(["STUDENT"]),
  getStudentSubmissions,
);
// Supervisor only: View pending projects for review [cite: 21, 27]
router.get(
  "/pending",
  authenticate,
  authorize(["SUPERVISOR"]),
  getPendingProjects,
);

export default router;
