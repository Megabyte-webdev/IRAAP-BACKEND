import { Router } from "express";
import {
  getProjectDetails,
  getProjectVersionHistory,
  getProjectVersion,
  getStudentSubmissions,
  submitProject,
  updateProject,
  getAllProjects,
} from "../controllers/project.controller.js";
import { authenticate, authorize, optionalAuthenticate } from "../middleware/auth.js";
import { requireUserBillingEntitlement } from "../middleware/organizationAccess.js";
import { uploadPdf } from "../middleware/upload.js";
import {
  publishProject,
  releaseProjectForPublication,
} from "../controllers/review.controller.js";

const router: Router = Router();

// Submit a new research project
router.post(
  "/submit",
  authenticate,
  authorize(["STUDENT"]),
  requireUserBillingEntitlement,
  uploadPdf("file"),
  submitProject,
);

// Update existing project (only own projects)
router.put(
  "/:id",
  authenticate,
  authorize(["STUDENT"]),
  uploadPdf("file"),
  updateProject,
);

// View own submissions
router.get(
  "/submissions",
  authenticate,
  authorize(["STUDENT"]),
  getStudentSubmissions,
);

// View version history for own project
router.get(
  "/:id/history",
  authenticate,
  authorize(["STUDENT"]),
  getProjectVersionHistory,
);

// Get specific version
router.get(
  "/:id/versions/:versionNumber",
  authenticate,
  authorize(["STUDENT"]),
  getProjectVersion,
);

router.post(
  "/:projectId/release",
  authenticate,
  authorize(["SUPERVISOR"]),
  releaseProjectForPublication,
);

router.post(
  "/:projectId/publish",
  authenticate,
  authorize(["STUDENT"]),
  publishProject,
);

router.get("/", getAllProjects);
router.get("/:id", optionalAuthenticate, getProjectDetails);

export default router;
