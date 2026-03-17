import type { Request, Response } from "express";
import { db } from "../config/db.js";
import { categories, metadata, projects } from "../database/schema.js";
import { and, eq, ilike } from "drizzle-orm";

export const searchProjects = async (req: Request, res: Response) => {
  const { title, year, researchArea, methodology } = req.query;
  try {
    const results = await db
      .select()
      .from(projects)
      .innerJoin(categories, eq(projects.categoryId, categories.id))
      .innerJoin(metadata, eq(projects.id, metadata.projectId))
      .where(
        and(
          title ? ilike(projects.title, `%${title}%`) : undefined,
          year ? eq(projects.submissionYear, Number(year)) : undefined,
          researchArea
            ? ilike(metadata.researchArea, `%${researchArea}%`)
            : undefined,
          methodology
            ? ilike(metadata.methodology, `%${methodology}%`)
            : undefined,
        ),
      );
    res.status(200).json({ message: "Search successful", projects: results });
  } catch (error) {
    res.status(500).json({ message: "Search failed", error });
  }
};

export const getCategories = async (req: Request, res: Response) => {
  try {
    const categoriesList = await db.select().from(categories);
    res
      .status(200)
      .json({
        message: "Categories fetched successfully",
        categories: categoriesList,
      });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch categories", error });
  }
};
