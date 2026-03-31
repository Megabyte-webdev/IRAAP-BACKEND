import { Router } from "express";
import {
  bulkAssignSupervisor,
  bulkImportStudents,
  bulkImportSupervisors,
  getAdminDashboard,
  getStudents,
  getSupervisors,
  getUnassignedStudents,
} from "../controllers/admin.controller.js";
import { authenticate, authorize } from "../middleware/auth.js";

const router: Router = Router();

// Define admin routes here (e.g., user management, category management)
router.get("/dashboard", authenticate, authorize(["ADMIN"]), getAdminDashboard);
router.get("/supervisors", authenticate, authorize(["ADMIN"]), getSupervisors);
router.get(
  "/unassigned-students",
  authenticate,
  authorize(["ADMIN"]),
  getUnassignedStudents,
);
router.get("/students", authenticate, authorize(["ADMIN"]), getStudents);
router.post(
  "/assign-supervisor",
  authenticate,
  authorize(["ADMIN"]),
  bulkAssignSupervisor,
);

router.post(
  "/bulk-students",
  authenticate,
  authorize(["ADMIN"]),
  bulkImportStudents,
);

router.post(
  "/bulk-supervisors",
  authenticate,
  authorize(["ADMIN"]),
  bulkImportSupervisors,
);

export default router;
