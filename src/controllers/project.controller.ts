import type { Request, Response } from "express";
import { db } from "../config/db.js";
import { categories, metadata, projects } from "../database/schema.js";
import { uploadToCloudinary } from "../utils/fileUpload.js";
import { and, eq, sql } from "drizzle-orm";
import cloudinary from "../config/cloudinary.js";
import { z } from "zod";

// Helper to sanitize text
const sanitizeString = (input: string) =>
  input.replace(/<[^>]*>?/gm, "").trim();

// Zod schemas
const projectSchema = z.object({
  title: z.string().min(1),
  abstract: z.string().min(1),
  submissionYear: z.preprocess((val) => Number(val), z.number().int()),
  categoryId: z.preprocess((val) => Number(val), z.number().int()),
  methodology: z.string().min(1),
  researchArea: z.string().optional().default(""),
  keywords: z
    .array(z.string())
    .transform((arr) => arr.map((k) => sanitizeString(k))),
  supervisorId: z.number().int(),
});

// -------------------- SUBMIT PROJECT --------------------
export const submitProject = async (req: Request, res: Response) => {
  const studentId = (req as any).user?.userId;
  const supervisorId = (req as any).user?.supervisorId;
  const file = req.file;

  if (!file) return res.status(400).json({ message: "No PDF file provided" });
  if (file.size > 20 * 1024 * 1024)
    return res.status(400).json({ message: "File size must be < 20MB" });

  let parsed;
  try {
    parsed = projectSchema.parse(req.body);
  } catch (err: any) {
    return res
      .status(400)
      .json({ message: "Invalid input", error: err.errors });
  }

  // Sanitize fields
  parsed.title = sanitizeString(parsed.title);
  parsed.abstract = sanitizeString(parsed.abstract);
  parsed.methodology = sanitizeString(parsed.methodology);
  parsed.researchArea = sanitizeString(parsed.researchArea);

  let uploadResult: any;
  try {
    uploadResult = await uploadToCloudinary(file.buffer);

    const newProject = await db.transaction(async (tx) => {
      const [project] = await tx
        .insert(projects)
        .values({
          title: parsed.title,
          abstract: parsed.abstract,
          fileUrl: uploadResult.url,
          publicId: uploadResult.publicId,
          submissionYear: parsed.submissionYear,
          supervisorId,
          studentId,
          categoryId: parsed.categoryId,
          status: "PENDING",
        })
        .returning();

      // Save keywords as proper array
      await tx.insert(metadata).values({
        projectId: project.id,
        keywords: parsed.keywords, // array of strings
        researchArea: parsed.researchArea,
        methodology: parsed.methodology,
      });

      return project;
    });

    return res
      .status(201)
      .json({ message: "Project submitted successfully", project: newProject });
  } catch (error: any) {
    console.error("Upload error:", error);
    if (uploadResult?.publicId)
      await cloudinary.uploader.destroy(uploadResult.publicId);

    if (error.code === "23505") {
      return res.status(400).json({
        message: "You have already submitted a project with this title.",
      });
    }

    return res
      .status(500)
      .json({ message: "Submission failed", error: error.message });
  }
};

// -------------------- UPDATE PROJECT --------------------
export const updateProject = async (req: Request, res: Response) => {
  const projectId = Number(req.params.id);
  const studentId = (req as any).user?.userId;
  const supervisorId = (req as any).user?.supervisorId;
  const file = req.file;

  let parsed;
  try {
    parsed = projectSchema.parse(req.body);
  } catch (err: any) {
    return res
      .status(400)
      .json({ message: "Invalid input", error: err.errors });
  }

  parsed.title = sanitizeString(parsed.title);
  parsed.abstract = sanitizeString(parsed.abstract);
  parsed.methodology = sanitizeString(parsed.methodology);
  parsed.researchArea = sanitizeString(parsed.researchArea);

  let uploadResult: any;
  try {
    if (file) uploadResult = await uploadToCloudinary(file.buffer);

    const updatedProject = await db.transaction(async (tx) => {
      const updateData: any = {
        title: parsed.title,
        abstract: parsed.abstract,
        submissionYear: parsed.submissionYear,
        categoryId: parsed.categoryId,
        supervisorId,
      };
      if (uploadResult) {
        updateData.fileUrl = uploadResult.url;
        updateData.publicId = uploadResult.publicId;
      }

      const [project] = await tx
        .update(projects)
        .set(updateData)
        .where(
          and(eq(projects.id, projectId), eq(projects.studentId, studentId)),
        )
        .returning();

      await tx
        .update(metadata)
        .set({
          keywords: parsed.keywords, // proper array
          researchArea: parsed.researchArea,
          methodology: parsed.methodology,
        })
        .where(eq(metadata.projectId, projectId));

      return project;
    });

    return res.status(200).json({
      message: "Project updated successfully",
      project: updatedProject,
    });
  } catch (error: any) {
    console.error("Update error:", error);
    if (uploadResult?.publicId)
      await cloudinary.uploader.destroy(uploadResult.publicId);

    return res
      .status(500)
      .json({ message: "Project update failed", error: error.message });
  }
};

// -------------------- GET PENDING PROJECTS --------------------
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

// -------------------- GET STUDENT SUBMISSIONS --------------------
export const getStudentSubmissions = async (req: Request, res: Response) => {
  const studentId = Number((req as any)?.user?.userId);
  try {
    const submissions = await db.query.projects.findMany({
      where: eq(projects.studentId, studentId),
    });
    res.status(200).json({
      message: "Student submissions fetched successfully",
      projects: submissions,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching student submissions", error });
  }
};

// -------------------- GET PROJECT DETAILS --------------------
export const getProjectDetails = async (req: Request, res: Response) => {
  const projectId = Number(req.params.id);

  try {
    const project = await db
      .select({
        id: projects.id,
        title: projects.title,
        abstract: projects.abstract,
        fileUrl: projects.fileUrl,
        submissionYear: projects.submissionYear,
        status: projects.status,
        categoryId: projects.categoryId,
        category: categories.name,
        keywords: metadata.keywords,
        researchArea: metadata.researchArea,
        methodology: metadata.methodology,
        author: sql<string>`(SELECT full_name FROM users WHERE id = ${projects.studentId})`,
        supervisor: sql<string>`(SELECT full_name FROM users WHERE id = ${projects.supervisorId})`,
        createdAt: projects.createdAt,
      })
      .from(projects)
      .innerJoin(categories, eq(projects.categoryId, categories.id))
      .innerJoin(metadata, eq(projects.id, metadata.projectId))
      .where(eq(projects.id, projectId))
      .then((results) => results[0]);

    if (!project) return res.status(404).json({ message: "Project not found" });

    res
      .status(200)
      .json({ message: "Project details fetched successfully", project });
  } catch (error) {
    res.status(500).json({ message: "Error fetching project details", error });
  }
};
