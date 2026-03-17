import { Router } from "express";
import {
  bulkAssignSupervisor,
  getAdminDashboard,
  getStudents,
  getSupervisors,
  getUnassignedStudents,
} from "../controllers/admin.controller.js";

const router: Router = Router();

// Define admin routes here (e.g., user management, category management)
router.get("/dashboard", getAdminDashboard);
router.get("/supervisors", getSupervisors);
router.get("/unassigned-students", getUnassignedStudents);
router.get("/students", getStudents);
router.post("/assign-supervisor", bulkAssignSupervisor);
export default router;
