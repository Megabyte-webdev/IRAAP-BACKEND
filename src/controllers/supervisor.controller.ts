import type { Request, Response } from "express";
import { db } from "../config/db.js";
import { projects, reviews, statusEnum } from "../database/schema.js";
import { and, eq, sql } from "drizzle-orm";
import { title } from "node:process";

export const getSupervisorStats = async (req: Request, res: Response) => {
  const supervisorId = Number((req as any).user.userId);
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
  const supervisorId = Number((req as any).user.userId);
  try {
    const allProjects = await db
      .select({
        id: projects.id,
        title: projects.title,
        submissionYear: projects.submissionYear,
        abstract: projects.abstract,
        status: projects.status,
        student: sql<string>`(SELECT full_name FROM users WHERE id = ${projects.studentId})`,
        studentId: projects.studentId,
        supervisorId: projects.supervisorId,
        category: sql<string>`(SELECT name FROM categories WHERE id = ${projects.categoryId})`,
        fileUrl: projects.fileUrl,
        createdAt: projects.createdAt,
      })
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

export const updateProjectStatus = async (req: Request, res: Response) => {
  const supervisorId = Number((req as any).user.userId);
  const projectId = Number(req.params.id);
  const { status } = req.body as {
    status: "APPROVED" | "REJECTED" | "REVISION_REQUESTED";
  };

  if (!statusEnum(status)) {
    return res.status(400).json({ message: "Invalid status value" });
  }

  try {
    // Ensure the project belongs to the supervisor
    const project = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId));

    if (!project.length || project[0].supervisorId !== supervisorId) {
      return res
        .status(403)
        .json({ message: "You cannot update this project" });
    }

    // Update status
    await db.update(projects).set({ status }).where(eq(projects.id, projectId));

    res.status(200).json({ message: "Project status updated successfully" });
  } catch (error) {
    console.error("Error updating project status:", error);
    res.status(500).json({ message: "Failed to update project status", error });
  }
};
