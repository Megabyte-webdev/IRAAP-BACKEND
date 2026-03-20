import type { Request, Response } from "express";
import { db } from "../config/db.js";
import { projects, reviews } from "../database/schema.js";
import { and, eq, sql } from "drizzle-orm";

export const getSupervisorStats = async (req: Request, res: Response) => {
  const supervisorId = Number((req as any).user.id);
  try {
    const totalProjects = await db
      .select({ count: sql<number>`count(*)` })
      .from(projects)
      .where(eq(projects.supervisorId, supervisorId));
    const totalReviews = await db
      .select({ count: sql<number>`count(*)` })
      .from(reviews)
      .where(eq(reviews.reviewerId, supervisorId));
    const approvedProjects = await db
      .select({ count: sql<number>`count(*)` })
      .from(projects)
      .where(
        and(
          eq(projects.supervisorId, supervisorId),
          eq(projects.status, "APPROVED"),
        ),
      );

    res.status(200).json({
      message: "Supervisor Statistics fetched successfully",
      stats: {
        projects: totalProjects[0].count,
        projectReviews: totalReviews[0].count,
        approved: approvedProjects[0].count,
      },
    });
  } catch (error) {
    console.error("Error fetching supervisor statistics:", error);
    res
      .status(500)
      .json({ message: "Failed to fetch supervisor statistics", error });
  }
};

export const getSupervisorProjects = async (req: Request, res: Response) => {
  const supervisorId = Number((req as any).user.id);
  try {
    const allProjects = await db
      .select()
      .from(projects)
      .where(eq(projects.supervisorId, supervisorId));
    res.status(200).json({
      message: "Supervisor projects fetched successfully",
      projects: allProjects,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching supervisor projects", error });
  }
};
