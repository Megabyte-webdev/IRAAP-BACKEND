import type { Request, Response } from "express";
import { db } from "../config/db.js";
import { projects } from "../database/schema.js";

export const submitProject = async (req: Request, res: Response) => {
  const { title, abstract, fileUrl, submissionYear, supervisorId } = req.body;
  const studentId = (req as any).user.id; // From auth middleware

  try {
    const newProject = await db
      .insert(projects)
      .values({
        title,
        abstract,
        fileUrl,
        submissionYear,
        studentId,
        supervisorId,
        status: "PENDING", // Default state for new submissions
      })
      .returning();

    res
      .status(201)
      .json({
        message: "Project submitted successfully",
        project: newProject[0],
      });
  } catch (error) {
    res.status(500).json({ message: "Submission failed", error });
  }
};
