import { Router } from "express";
import {
  searchProjects,
  getCategories,
  getHomepageData,
} from "../controllers/search.controller.js";

const router: Router = Router();

router.get("/projects", searchProjects);

// Get all categories for dropdowns
router.get("/categories", getCategories);

router.get("/homepage-data", getHomepageData);

export default router;
