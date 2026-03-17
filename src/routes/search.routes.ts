import { Router } from "express";
import {
  searchProjects,
  getCategories,
} from "../controllers/search.controller.js";

const router: Router = Router();

router.get("/projects", searchProjects);
// Get all categories for dropdowns
router.get("/categories", getCategories);

export default router;
