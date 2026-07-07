import type { Request, Response } from "express";
import { db } from "../config/db.js";
import {
  projects,
  reviews,
  reviewTasks,
  statusEnum,
  users,
} from "../database/schema.js";
import { and, eq, not, desc, sql } from "drizzle-orm";

// 1. Fetching Stats (Unchanged - Count aggregations match your current flow)
export const getSupervisorStats = async (req: Request, res: Response) => {
  const supervisorId = Number((req as any).user.id);

  try {
    const totalProjects = await db
      .select({ count: sql<number>`count(*)` })
      .from(projects)
      .where(eq(projects.supervisorId, supervisorId));

    const approvedProjects = await db
      .select({ count: sql<number>`count(*)` })
      .from(projects)
      .where(
        and(
          eq(projects.supervisorId, supervisorId),
          eq(projects.status, "APPROVED"),
        ),
      );

    const totalReviews = await db
      .select({ count: sql<number>`count(*)` })
      .from(reviews)
      .where(eq(reviews.reviewerId, supervisorId));

    return res.status(200).json({
      message: "Supervisor Statistics fetched successfully",
      stats: {
        projects: totalProjects[0].count,
        projectReviews: totalReviews[0].count,
        approved: approvedProjects[0].count,
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch supervisor statistics",
      error,
    });
  }
};

// 2. REFACTORED: Clean Drizzle Relational Fetch
export const getSupervisorProjects = async (req: Request, res: Response) => {
  const supervisorId = Number((req as any).user.id);

  try {
    // Using Drizzle Relational API for nested entity hydration
    const allProjects = await db.query.projects.findMany({
      where: eq(projects.supervisorId, supervisorId),
      with: {
        student: {
          columns: {
            id: true,
            fullName: true,
          },
        },
        currentVersion: {
          columns: {
            fileUrl: true,
          },
        },
      },
    });

    // Remap to match your front-end shape requirements perfectly
    const formattedProjects = allProjects.map((p) => ({
      id: p.id,
      title: p.title,
      submissionYear: p.submissionYear,
      abstract: p.abstract,
      status: p.status,
      studentId: p.studentId,
      supervisorId: p.supervisorId,
      student: p.student?.fullName || null,
      fileUrl: p.currentVersion?.fileUrl || null,
      currentVersionId: p.currentVersionId,
      createdAt: p.createdAt,
    }));

    return res.status(200).json({
      message: "Supervisor projects fetched successfully",
      projects: formattedProjects,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error fetching supervisor projects",
      error,
    });
  }
};

// 3. Project Status Update (Unchanged)
export const updateProjectStatus = async (req: Request, res: Response) => {
  const supervisorId = Number((req as any).user.id);
  const projectId = Number(req.params.id);
  const { status } = req.body as {
    status: "APPROVED" | "REJECTED" | "REVISION_REQUESTED";
  };

  if (!statusEnum(status)) {
    return res.status(400).json({ message: "Invalid status value" });
  }

  try {
    const project = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId));

    if (!project.length || project[0].supervisorId !== supervisorId) {
      return res
        .status(403)
        .json({ message: "You cannot update this project" });
    }

    const unverifiedTasks = await db
      .select()
      .from(reviewTasks)
      .where(
        and(
          eq(reviewTasks.projectId, projectId),
          not(eq(reviewTasks.status, "VERIFIED")),
        ),
      );

    if (unverifiedTasks.length > 0) {
      return res.status(400).json({
        message:
          "Cannot update project status: all review tasks must be verified first",
      });
    }

    await db.update(projects).set({ status }).where(eq(projects.id, projectId));

    res.status(200).json({ message: "Project status updated successfully" });
  } catch (error) {
    console.error("Error updating project status:", error);
    res.status(500).json({ message: "Failed to update project status", error });
  }
};

export const projectStudents = async (req: Request, res: Response) => {
  const supervisorId = Number((req as any).user.id);

  try {
    const assignedStudents = await db.query.users.findMany({
      where: and(
        eq(users.supervisorId, supervisorId),
        eq(users.role, "STUDENT"),
      ),
      columns: {
        id: true,
        fullName: true,
        email: true,
        supervisorId: true,
      },
      orderBy: [desc(users.createdAt)],
    });

    const studentIds = assignedStudents.map((s) => s.id);

    let activeProjects: any[] = [];
    if (studentIds.length > 0) {
      activeProjects = await db
        .select({
          id: projects.id,
          title: projects.title,
          status: projects.status,
          studentId: projects.studentId,
        })
        .from(projects)
        .where(sql`${projects.studentId} IN ${studentIds}`);
    }

    const studentRoster = assignedStudents.map((student) => {
      const match = activeProjects.find((p) => p.studentId === student.id);
      return {
        ...student,
        projectId: match?.id || null,
        projectTitle: match?.title || null,
        projectStatus: match?.status || null,
      };
    });

    return res.status(200).json({
      success: true,
      message: "Assigned research students fetched successfully",
      students: studentRoster,
    });
  } catch (error) {
    console.error("Error fetching supervisor's students:", error);
    return res.status(500).json({
      success: false,
      message:
        "Internal Server Error while retrieving assigned student rosters",
      error,
    });
  }
};
