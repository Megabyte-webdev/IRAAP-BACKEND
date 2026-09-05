import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth.js";
import {
  createOrganization,
  getOrganizations,
} from "../controllers/organization.controller.js";

const router: Router = Router();

router.get("/", authenticate, authorize(["ADMIN"]), getOrganizations);
router.post("/", authenticate, authorize(["ADMIN"]), createOrganization);

export default router;
