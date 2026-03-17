import type { Request, Response } from "express";
import { db } from "../config/db.js";
import { metadata, projects } from "../database/schema.js";
import { uploadToCloudinary } from "../utils/fileUpload.js";
import { and, eq, sql } from "drizzle-orm";
import cloudinary from "../config/cloudinary.js";

export const submitProject = async (req: Request, res: Response) => {
  const {
    title,
    abstract,
    submissionYear,
    supervisorId,
    categoryId,
    keywords,
    researchArea,
    methodology,
  } = req.body;
  const studentId = (req as any).user?.userId;
  const file = req.file;

  if (!file) return res.status(400).json({ message: "No file provided" });

  let uploadResult: any;

  try {
    uploadResult = await uploadToCloudinary(file.buffer);

    const result = await db.transaction(async (tx) => {
      // Create the project
      const [newProject] = await tx
        .insert(projects)
        .values({
          title,
          abstract,
          fileUrl: uploadResult.url,
          publicId: uploadResult.publicId,
          submissionYear,
          supervisorId,
          studentId,
          categoryId,
          status: "PENDING",
        })
        .returning();

      // Create the metadata
      await tx.insert(metadata).values({
        projectId: newProject.id,
        keywords,
        researchArea,
        methodology,
      });

      return newProject;
    });

    res
      .status(201)
      .json({ message: "Project submitted successfully", project: result });
  } catch (error: any) {
    console.error("Upload error:", error);

    // delete the image we just uploaded to Cloudinary
    if (uploadResult?.publicId) {
      await cloudinary.uploader.destroy(uploadResult.publicId); // Implement this helper
    }

    // Handle Unique Constraint Error specifically
    if (error.code === "23505") {
      return res
        .status(400)
        .json({
          message: "You have already submitted a project with this title.",
        });
    }

    res
      .status(500)
      .json({ message: "Submission failed", error: error.message });
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
    res.status(200).json({
      message: "Pending projects fetched successfully",
      projects: pendingProjects,
    });
  } catch (error) {
    res.status(500).json({ message: "Error fetching pending projects", error });
  }
};

export const getStudentSubmissions = async (req: Request, res: Response) => {
  const studentId = Number((req as any)?.user?.userId);

  try {
    const studentSubmissions = await db.query.projects.findMany({
      where: eq(projects.studentId, studentId),
    });
    res.status(200).json({
      message: "Student submissions fetched successfully",
      projects: studentSubmissions,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching student submissions", error });
  }
};
