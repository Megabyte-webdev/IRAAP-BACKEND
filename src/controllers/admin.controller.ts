import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { categories, projects, roleEnum, users } from "../database/schema.js";
import { db } from "../config/db.js";
import type { Request, Response } from "express";
import { email } from "zod";
import { withPagination } from "../utils/pagination.js";
import { alias } from "drizzle-orm/pg-core";

export const getAdminDashboard = async (req: Request, res: Response) => {
  try {
    const totalProjects = await db
      .select({ count: sql<number>`count(*)` })
      .from(projects);
    const totalUsers = await db
      .select({ count: sql<number>`count(*)` })
      .from(users);
    const totalCategories = await db
      .select({ count: sql<number>`count(*)` })
      .from(categories);

    res.status(200).json({
      message: "Admin dashboard data fetched successfully",
      stats: {
        totalProjects: totalProjects[0].count,
        totalUsers: totalUsers[0].count,
        totalCategories: totalCategories[0].count,
      },
    });
  } catch (error) {
    console.error("Error fetching admin dashboard data:", error);
    res
      .status(500)
      .json({ message: "Failed to fetch admin dashboard data", error });
  }
};

//assign supervisor to students in bulk
export const bulkAssignSupervisor = async (req: Request, res: Response) => {
  const { supervisorId, studentIds } = req.body;
  //txn
  try {
    await db.transaction(async (tx) => {
      await tx
        .update(users)
        .set({ supervisorId: supervisorId, updatedAt: new Date() })
        .where(inArray(users.id, studentIds));

      console.log(
        `Assigned ${studentIds.length} students to Supervisor #${supervisorId}`,
      );
    });
    res
      .status(200)
      .json({ message: "Supervisor assigned to students successfully" });
  } catch (error) {
    console.error("Error assigning supervisor to students:", error);
    res
      .status(500)
      .json({ message: "Failed to assign supervisor to students", error });
  }
};

export const getSupervisors = async (req: Request, res: Response) => {
  //add student count for each supervisor
  try {
    const supervisors = await db
      .select({
        id: users.id,
        name: users.fullName,
        email: users.email,
        studentCount: sql<number>`(SELECT COUNT(*) FROM users WHERE supervisor_id = users.supervisor_id)`,
      })
      .from(users)
      .where(eq(users.role, "SUPERVISOR"));
    res.status(200).json({
      message: "Supervisors fetched successfully",
      supervisors,
    });
  } catch (error) {
    console.error("Error fetching supervisors:", error);
    res.status(500).json({ message: "Failed to fetch supervisors", error });
  }
};

//get students without supervisors paginated
export const getUnassignedStudents = async (req: Request, res: Response) => {
  const page = Math.max(1, Number(req.query.page) || 1); // Basic input sanitization
  const limit = Math.min(50, Number(req.query.limit) || 10); // Prevent DOS via huge limits

  try {
    const query: any = db
      .select({
        id: users.id,
        name: users.fullName,
        email: users.email,
      })
      .from(users)
      .where(and(isNull(users.supervisorId), eq(users.role, "STUDENT")));

    const result = await withPagination(query, { page, limit });

    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

export const getStudents = async (req: Request, res: Response) => {
  // 1. Basic Input Sanitization
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(50, Number(req.query.limit) || 10);

  try {
    const supervisorAlias: any = alias(users, "supervisor");

    // 2. Build the Secure Query
    const query: any = db
      .select({
        id: users.id,
        fullName: users.fullName,
        email: users.email,
        supervisorName: supervisorAlias.fullName,
        supervisorId: supervisorAlias.id,
      })
      .from(users)
      .leftJoin(supervisorAlias, eq(users.supervisorId, supervisorAlias.id))
      .where(eq(users.role, "STUDENT"))
      .orderBy(users.createdAt);

    // 3. Execute with Secure Pagination Utility
    const result = await withPagination(query, { page, limit });

    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("Fetch Students Error:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};
