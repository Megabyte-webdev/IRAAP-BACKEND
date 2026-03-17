import type { Request, Response } from "express";
import { db } from "../config/db.js";
import { categories, metadata, projects } from "../database/schema.js";
import { uploadToCloudinary } from "../utils/fileUpload.js";
import { and, eq, sql } from "drizzle-orm";
import cloudinary from "../config/cloudinary.js";

export const submitProject = async (req: Request, res: Response) => {
  const {
    title,
    abstract,
    submissionYear,
    categoryId,
    keywords,
    researchArea,
    methodology,
  } = req.body;
  const studentId = (req as any).user?.userId;
  const supervisorId = (req as any).user?.supervisorId;
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
      return res.status(400).json({
        message: "You have already submitted a project with this title.",
      });
    }

    res
      .status(500)
      .json({ message: "Submission failed", error: error.message });
  }
};

export const updateProject = async (req: Request, res: Response) => {
  const projectId = Number(req.params.id);
  const {
    title,
    abstract,
    submissionYear,
    categoryId,
    keywords,
    researchArea,
    methodology,
  } = req.body;
  const studentId = (req as any).user?.userId;
  const file = req.file;
  let uploadResult: any;

  try {
    if (file) {
      uploadResult = await uploadToCloudinary(file.buffer);
    }

    const result = await db.transaction(async (tx) => {
      // Update the project
      const updateData: any = {
        title,
        abstract,
        submissionYear,
        categoryId,
      };
      if (uploadResult) {
        updateData.fileUrl = uploadResult.url;
        updateData.publicId = uploadResult.publicId;
      }
      const [updatedProject] = await tx
        .update(projects)
        .set(updateData)
        .where(
          and(eq(projects.id, projectId), eq(projects.studentId, studentId)),
        )
        .returning();

      // Update the metadata
      await tx
        .update(metadata)
        .set({
          keywords,
          researchArea,
          methodology,
        })
        .where(eq(metadata.projectId, projectId));
      return updatedProject;
    });

    res
      .status(200)
      .json({ message: "Project updated successfully", project: result });
  } catch (error: any) {
    console.error("Update error:", error);
    // delete the image we just uploaded to Cloudinary if update fails
    if (uploadResult?.publicId) {
      await cloudinary.uploader.destroy(uploadResult.publicId); // Implement this helper
    }
    res
      .status(500)
      .json({ message: "Project update failed", error: error.message });
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
        //set studentname as author
        author: sql<string>`(SELECT full_name FROM users WHERE id = ${projects.studentId})`,
        supervisor: sql<string>`(SELECT full_name FROM users WHERE id = ${projects.supervisorId})`,
        createdAt: projects.createdAt,
      })
      .from(projects)
      .innerJoin(categories, eq(projects.categoryId, categories.id))
      .innerJoin(metadata, eq(projects.id, metadata.projectId))
      .where(eq(projects.id, projectId))
      .then((results) => results[0]);

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    res
      .status(200)
      .json({ message: "Project details fetched successfully", project });
  } catch (error) {
    res.status(500).json({ message: "Error fetching project details", error });
  }
};
