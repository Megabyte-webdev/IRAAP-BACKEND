import { Router } from "express";
import {
  searchProjects,
  getCategories,
  getHomepageData,
  getFilterOptions,
} from "../controllers/search.controller.js";

const router: Router = Router();

router.get("/projects", searchProjects);
router.get("/filter-options", getFilterOptions);

router.get("/categories", getCategories);

router.get("/homepage-data", getHomepageData);

export default router;
