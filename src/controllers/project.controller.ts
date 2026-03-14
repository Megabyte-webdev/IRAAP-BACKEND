import type { Request, Response } from "express";
import { db } from "../config/db.js";
import { projects } from "../database/schema.js";
import { uploadToCloudinary } from "../utils/fileUpload.js";
import { and, eq } from "drizzle-orm/sql/expressions/conditions";

export const submitProject = async (req: Request, res: Response) => {
  const { title, abstract, submissionYear, supervisorId } = req.body;
  const studentId = (req as any).user.id;
  const file = req.file;

  if (!file) return res.status(400).json({ message: "No file provided" });

  try {
    // Directly pass the buffer to the service
    const uploadResult: any = await uploadToCloudinary(file.buffer);

    const [newProject] = await db
      .insert(projects)
      .values({
        title,
        abstract,
        fileUrl: uploadResult.url,
        publicId: uploadResult.publicId,
        submissionYear,
        supervisorId,
        studentId,
        status: "PENDING",
      })
      .returning();

    res.status(201).json({ message: "Success", project: newProject });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ message: "Submission failed", error });
  }
};

export const getPendingProjects = async (req: Request, res: Response) => {
  const supervisorId = Number((req as any).user.id);

  try {
    const pendingProjects = await db
      .select()
      .from(projects)
      .where(
        and(
          eq(projects.supervisorId, supervisorId),
          eq(projects.status, "PENDING"),
        ),
      );
    res.status(200).json(pendingProjects);
  } catch (error) {
    res.status(500).json({ message: "Error fetching pending projects", error });
  }
};

export const getStudentSubmissions = async (req: Request, res: Response) => {
  const studentId = Number((req as any).user.id);

  try {
    const studentSubmissions = await db.query.projects.findMany({
      where: (projects, { eq }) => eq(projects.studentId, studentId),
    });

    res.status(200).json(studentSubmissions);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching student submissions", error });
  }
};
