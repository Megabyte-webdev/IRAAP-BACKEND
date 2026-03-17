import type { Request, Response } from "express";
import { db } from "../config/db.js";
import { categories, metadata, projects, users } from "../database/schema.js";
import { and, desc, eq, ilike, sql } from "drizzle-orm";

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
    res.status(200).json({
      message: "Categories fetched successfully",
      categories: categoriesList,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch categories", error });
  }
};

export const getHomepageData = async (req: Request, res: Response) => {
  try {
    const [projectsCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(projects);

    const [researchersCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(eq(users.role, "STUDENT"));

    const [supervisorsCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(eq(users.role, "SUPERVISOR"));

    // Featured Projects (latest approved)
    const featuredProjects = await db
      .select({
        id: projects.id,
        title: projects.title,
        category: categories.name,
        abstract: projects.abstract,
        categoryId: projects.categoryId,
        createdAt: projects.createdAt,
      })
      .from(projects)
      .leftJoin(categories, eq(projects.categoryId, categories.id))
      .limit(6)
      .orderBy(desc(projects.createdAt));

    res.status(200).json({
      stats: {
        projects: Number(projectsCount.count),
        researchers: Number(researchersCount.count),
        supervisors: Number(supervisorsCount.count),
      },
      featuredProjects,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch homepage data" });
  }
};
