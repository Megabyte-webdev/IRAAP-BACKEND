import { Router } from "express";
import { submitProject } from "../controllers/project.controller.js";
import { authenticate, authorize } from "../middleware/auth.js";

const router: Router = Router();

// Student only: Submit a new research project [cite: 20, 26]
router.post("/submit", authenticate, authorize(["STUDENT"]), submitProject);

// Supervisor only: View pending projects for review [cite: 21, 27]
router.get(
  "/pending",
  authenticate,
  authorize(["SUPERVISOR"]),
  async (req, res) => {
    // Logic to fetch projects filtered by supervisorId and status 'PENDING'
  },
);

export default router;
