import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth.js";
import {
  addOrganizationMember,
  bulkImportOrganizationMembers,
  createOrganization,
  getOrganizationAnalytics,
  getOrganizationMembers,
  removeOrganizationMember,
  getOrganizations,
  upsertOrganizationSubscription,
} from "../controllers/organization.controller.js";

const router: Router = Router();

router.use(authenticate, authorize(["ADMIN"]));
router.get("/", getOrganizations);
router.post("/", createOrganization);
router.get("/:organizationId/members", getOrganizationMembers);
router.post("/:organizationId/members", addOrganizationMember);
router.delete("/:organizationId/members/:userId", removeOrganizationMember);
router.post("/:organizationId/import", bulkImportOrganizationMembers);
router.get("/:organizationId/analytics", getOrganizationAnalytics);
router.put("/:organizationId/subscription", upsertOrganizationSubscription);

export default router;
