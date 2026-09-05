import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { requireBillingEntitlement, requireOrganizationRole } from "../middleware/organizationAccess.js";
import {
  createOrganizationManager,
  addOrganizationMemberByManager,
  getManagerDashboard,
  getManagerMembers,
  updateOrganizationMemberRole,
  removeOrganizationMemberByManager,
  initializeOrganizationCheckout,
  verifyOrganizationCheckout,
  getOrganizationBilling,
} from "../controllers/manager.controller.js";

const router: Router = Router();
router.use(authenticate, requireOrganizationRole(["MANAGER"]));

router.get("/dashboard", getManagerDashboard);
router.get("/members", getManagerMembers);

router.post("/members", requireBillingEntitlement({ allowTrial: true }), addOrganizationMemberByManager);
router.post("/managers", requireBillingEntitlement({ allowTrial: true }), createOrganizationManager);
router.patch("/members/:userId/role", requireBillingEntitlement({ allowTrial: true }), updateOrganizationMemberRole);
router.delete("/members/:userId", requireBillingEntitlement({ allowTrial: true }), removeOrganizationMemberByManager);

router.get("/billing", getOrganizationBilling);
router.post("/billing/checkout", initializeOrganizationCheckout);
router.get("/billing/verify/:reference", verifyOrganizationCheckout);

export default router;
