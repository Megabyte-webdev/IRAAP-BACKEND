import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth.js";
import {
  createOrganization,
  getOrganizations,
  getMyOrganization,
} from "../controllers/organization.controller.js";

const router: Router = Router();

router.get("/me", authenticate, getMyOrganization);
router.get("/", authenticate, authorize(["ADMIN"]), getOrganizations);
router.post("/", authenticate, authorize(["ADMIN"]), createOrganization);

export default router;
