import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { categories, projects, users } from "../database/schema.js";
import { db } from "../config/db.js";
import type { Request, Response } from "express";
import { withPagination } from "../utils/pagination.js";
import { alias } from "drizzle-orm/pg-core";
import bcrypt from "bcrypt";
import z from "zod";
import { eventBus } from "../events/index.js";
import { Events } from "../utils/email/email.types.js";

const bulkAssignSchema = z.object({
  supervisorId: z.number().positive(),
  studentIds: z.array(z.number().positive()).nonempty(),
});

// For Bulk Import
const studentImportSchema = z.object({
  students: z
    .array(
      z.object({
        lastname: z.string().min(1, "Lastname is required"),
        firstname: z.string().min(1, "Firstname is required"),
        email: z.string().email("Invalid email format"),
      }),
    )
    .nonempty("Student list cannot be empty"),
});
const supervisorImportSchema = z.object({
  supervisors: z
    .array(
      z.object({
        lastname: z.string().min(1, "Lastname is required"),
        firstname: z.string().min(1, "Firstname is required"),
        email: z.string().email("Invalid email format"),
      }),
    )
    .nonempty("Student list cannot be empty"),
});

export const getAdminDashboard = async (req: Request, res: Response) => {
  try {
    const [totalProjects, totalUsers, totalCategories] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(projects),
      db.select({ count: sql<number>`count(*)` }).from(users),
      db.select({ count: sql<number>`count(*)` }).from(categories),
    ]);

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
    res.status(500).json({ message: "Failed to fetch admin dashboard data" });
  }
};

//assign supervisor to students in bulk
export const bulkAssignSupervisor = async (req: Request, res: Response) => {
  const validation = bulkAssignSchema.safeParse(req.body);

  if (!validation.success) {
    return res.status(400).json({
      success: false,
      errors: validation.error,
    });
  }

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
      .json({ message: "Failed to assign supervisor to students" });
  }
};

export const bulkImportStudents = async (req: Request, res: Response) => {
  // 1. Validate Input
  const validation = studentImportSchema.safeParse(req.body);

  if (!validation.success) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: validation.error,
    });
  }

  const { students } = validation.data;

  try {
    const studentsToInsert = await Promise.all(
      students.map(async (s) => {
        const email = s.email.toLowerCase().trim();
        const fullName = `${s.lastname.trim()} ${s.firstname.trim()}`;
        const surname = s.lastname.trim().toLowerCase();

        // Default password is lowercase surname
        const passwordHash = await bcrypt.hash(surname, 12);

        return {
          fullName,
          email,
          password: passwordHash,
          role: "STUDENT" as const,
        };
      }),
    );

    await db
      .insert(users)
      .values(studentsToInsert)
      .onConflictDoNothing({ target: users.email });

    studentsToInsert.forEach((student) => {
      const rawPassword = student.fullName?.toLowerCase()?.trim()?.split(" ")[0];
      eventBus.emit(Events.USER_REGISTERED, {
        fullName: student.fullName,
        email: student.email,
        password: rawPassword,
        role: "Student",
      });
    });

    res.status(201).json({
      success: true,
      message: `Imported ${students.length} students. Default passwords are their surnames.`,
    });
  } catch (error) {
    console.error("Bulk Import Error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
export const bulkImportSupervisors = async (req: Request, res: Response) => {
  // 1. Validate Input
  const validation = supervisorImportSchema.safeParse(req.body);

  if (!validation.success) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: validation.error,
    });
  }

  const { supervisors } = validation.data;

  try {
    const supervisorsToInsert = await Promise.all(
      supervisors.map(async (s) => {
        const email = s.email.toLowerCase().trim();
        const fullName = `${s.lastname.trim()} ${s.firstname.trim()}`;
        const surname = s.lastname.trim().toLowerCase();

        // Default password is lowercase surname
        const passwordHash = await bcrypt.hash(`${surname}@irap`, 12);

        return {
          fullName,
          email,
          password: passwordHash,
          role: "SUPERVISOR" as const,
        };
      }),
    );

    await db
      .insert(users)
      .values(supervisorsToInsert)
      .onConflictDoNothing({ target: users.email });

    supervisorsToInsert.forEach((supervisor) => {
      const rawPassword = supervisor.fullName
        ?.toLowerCase()
        ?.trim()
        ?.split(" ")[0];
      eventBus.emit(Events.USER_REGISTERED, {
        fullName: supervisor.fullName,
        email: supervisor.email,
        password: `${rawPassword}@irap`,
        role: "Supervisor",
      });
    });

    res.status(201).json({
      success: true,
      message: `Imported ${supervisors.length} supervisors. Default passwords are their surnames.`,
    });
  } catch (error) {
    console.error("Bulk Import Error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const getSupervisors = async (req: Request, res: Response) => {
  try {
    const studentUser = alias(users, "student");

    const supervisors = await db
      .select({
        id: users.id,
        name: users.fullName,
        email: users.email,
        studentCount: sql<number>`count(${studentUser.id})::int`,
      })
      .from(users)
      .leftJoin(studentUser as any, eq(users.id, studentUser.supervisorId))
      .where(eq(users.role, "SUPERVISOR"))
      .groupBy(users.id);

    res.status(200).json({ message: "Supervisors fetched", supervisors });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch supervisors" });
  }
};

//get students without supervisors paginated
export const getUnassignedStudents = async (req: Request, res: Response) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(50, Number(req.query.limit) || 10);

  try {
    const countQuery = db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(and(isNull(users.supervisorId), eq(users.role, "STUDENT")));

    const dataQuery: any = db
      .select({
        id: users.id,
        name: users.fullName,
        email: users.email,
      })
      .from(users)
      .where(and(isNull(users.supervisorId), eq(users.role, "STUDENT")));

    const result = await withPagination({ dataQuery, countQuery, page, limit });

    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

export const getStudents = async (req: Request, res: Response) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(50, Number(req.query.limit) || 10);

  try {
    const supervisorAlias = alias(users, "supervisor");

    const countQuery = db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(eq(users.role, "STUDENT"));

    const latestProjects = db
      .selectDistinctOn([projects.studentId], {
        studentId: projects.studentId,
        status: projects.status,
      })
      .from(projects)
      .orderBy(projects.studentId, desc(projects.createdAt))
      .as("lp");

    const dataQuery = db
      .select({
        id: users.id,
        fullName: users.fullName,
        email: users.email,
        supervisorName: supervisorAlias.fullName,
        supervisorId: supervisorAlias.id,
        projectStatus: latestProjects.status,
      })
      .from(users)
      .leftJoin(
        supervisorAlias as any,
        eq(users.supervisorId, supervisorAlias.id),
      )
      .leftJoin(latestProjects, eq(users.id, latestProjects.studentId))
      .where(eq(users.role, "STUDENT"))
      .orderBy(desc(users.createdAt));

    const result = await withPagination({
      countQuery,
      dataQuery,
      page,
      limit,
    });

    res.status(200).json({ success: true, ...result });
  } catch (error) {
    console.error("Fetch Students Error:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};
