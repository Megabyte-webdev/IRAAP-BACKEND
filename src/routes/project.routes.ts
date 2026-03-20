import { Router } from "express";
import {
  getPendingProjects,
  getProjectDetails,
  getStudentSubmissions,
  submitProject,
  updateProject,
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

router.put(
  "/:id",
  authenticate,
  authorize(["STUDENT"]),
  upload.single("file"),
  updateProject,
);
//student view their submissions
router.get(
  "/submissions",
  authenticate,
  authorize(["STUDENT"]),
  getStudentSubmissions,
);

router.get("/:id", getProjectDetails);

export default router;
