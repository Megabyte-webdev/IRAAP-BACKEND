import type { Request, Response } from "express";
import { db } from "../config/db.js";
import {
  categories,
  metadata,
  projects,
  projectVersions,
} from "../database/schema.js";
import { uploadToCloudinary } from "../utils/fileUpload.js";
import { and, desc, eq, sql } from "drizzle-orm";
import cloudinary from "../config/cloudinary.js";
import { z } from "zod";
// HELPERS
const sanitizeString = (input: string) =>
  input.replace(/<[^>]*>?/gm, "").trim();

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
});
// SUBMIT PROJECT  (creates version 1)
export const submitProject = async (req: Request, res: Response) => {
  const studentId = (req as any).user?.id;
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
      .json({ message: "Invalid input", error: err.issues });
  }

  parsed.title = sanitizeString(parsed.title);
  parsed.abstract = sanitizeString(parsed.abstract);
  parsed.methodology = sanitizeString(parsed.methodology);
  parsed.researchArea = sanitizeString(parsed.researchArea);

  let uploadResult: any;

  try {
    uploadResult = await uploadToCloudinary(file.buffer);

    const result = await db.transaction(async (tx) => {
      const [project] = await (tx
        .insert(projects)
        .values({
          title: parsed.title,
          abstract: parsed.abstract,
          submissionYear: parsed.submissionYear,
          supervisorId,
          studentId,
          categoryId: parsed.categoryId,
          status: "PENDING",
          fileUrl: uploadResult.url, // kept in sync below
          publicId: uploadResult.publicId,
          totalVersions: 1,
          updatedAt: new Date(),
        })
        .returning() as Promise<any[]>);

      const [version] = await (tx
        .insert(projectVersions)
        .values({
          projectId: project.id,
          fileUrl: uploadResult.url,
          publicId: uploadResult.publicId,
          versionNumber: 1,
          uploadedBy: studentId,
          changeNote: "Initial submission",
          trigger: "INITIAL_SUBMISSION",
          fileSizeBytes: file.size,
        })
        .returning() as Promise<any[]>);

      // Point project at version 1
      await tx
        .update(projects)
        .set({ currentVersionId: version.id })
        .where(eq(projects.id, project.id));

      // Insert metadata
      await tx.insert(metadata).values({
        projectId: project.id,
        keywords: parsed.keywords,
        researchArea: parsed.researchArea,
        methodology: parsed.methodology,
      });

      return { project, version };
    });

    return res.status(201).json({
      message: "Project submitted successfully",
      project: result.project,
      version: result.version,
    });
  } catch (error: any) {
    console.error(error);
    if (uploadResult?.publicId) {
      await cloudinary.uploader.destroy(uploadResult.publicId);
    }
    return res.status(500).json({
      message: "Submission failed",
      error: error.message,
    });
  }
};
// UPDATE PROJECT  (student edits — STUDENT_UPDATE trigger)
export const updateProject = async (req: Request, res: Response) => {
  const projectId = Number(req.params.id);
  const studentId = (req as any).user?.id;
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
    const updated = await db.transaction(async (tx) => {
      const project = await tx.query.projects.findFirst({
        where: and(
          eq(projects.id, projectId),
          eq(projects.studentId, studentId),
        ),
      });

      if (!project) throw new Error("Project not found");

      let newVersionId = project.currentVersionId;
      let newTotalVersions = project.totalVersions;

      // Only create a new version when a replacement file is provided
      if (file) {
        uploadResult = await uploadToCloudinary(file.buffer);

        const lastVersion = await tx
          .select()
          .from(projectVersions)
          .where(eq(projectVersions.projectId, projectId))
          .orderBy(desc(projectVersions.versionNumber))
          .limit(1);

        const nextVersion = (lastVersion[0]?.versionNumber ?? 0) + 1;

        const [version] = await (tx
          .insert(projectVersions)
          .values({
            projectId,
            fileUrl: uploadResult.url,
            publicId: uploadResult.publicId,
            versionNumber: nextVersion,
            uploadedBy: studentId,
            changeNote: "Student update",
            trigger: "STUDENT_UPDATE",
            fileSizeBytes: file.size,
          })
          .returning() as Promise<any[]>);

        newVersionId = version.id;
        newTotalVersions = nextVersion;
      }

      const [updatedProject] = await (tx
        .update(projects)
        .set({
          title: parsed.title,
          abstract: parsed.abstract,
          submissionYear: parsed.submissionYear,
          categoryId: parsed.categoryId,
          supervisorId,
          currentVersionId: newVersionId,
          totalVersions: newTotalVersions,
          // Keep fileUrl in sync if file was replaced
          ...(uploadResult && {
            fileUrl: uploadResult.url,
            publicId: uploadResult.publicId,
          }),
          updatedAt: new Date(),
        })
        .where(eq(projects.id, projectId))
        .returning() as Promise<any[]>);

      await tx
        .update(metadata)
        .set({
          keywords: parsed.keywords,
          researchArea: parsed.researchArea,
          methodology: parsed.methodology,
        })
        .where(eq(metadata.projectId, projectId));

      return updatedProject;
    });

    return res.status(200).json({
      message: "Project updated successfully",
      project: updated,
    });
  } catch (error: any) {
    if (uploadResult?.publicId) {
      await cloudinary.uploader.destroy(uploadResult.publicId);
    }
    return res.status(500).json({
      message: "Project update failed",
      error: error.message,
    });
  }
};
// GET PENDING PROJECTS  (supervisor view)
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
// GET STUDENT SUBMISSIONS
export const getStudentSubmissions = async (req: Request, res: Response) => {
  const studentId = Number((req as any)?.user?.id);
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
// GET PROJECT DETAILS
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
        totalVersions: projects.totalVersions,
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
// GET VERSION HISTORY  (full audit trail)
export const getProjectVersionHistory = async (req: Request, res: Response) => {
  const projectId = Number(req.params.id);

  if (isNaN(projectId)) {
    return res.status(400).json({ message: "Invalid project id" });
  }

  try {
    // Confirm project exists and requester has access
    const project = await db.query.projects.findFirst({
      where: eq(projects.id, projectId),
    });
    if (!project) return res.status(404).json({ message: "Project not found" });

    const versions = await db
      .select({
        id: projectVersions.id,
        versionNumber: projectVersions.versionNumber,
        fileUrl: projectVersions.fileUrl,
        publicId: projectVersions.publicId,
        changeNote: projectVersions.changeNote,
        trigger: projectVersions.trigger,
        fileSizeBytes: projectVersions.fileSizeBytes,
        linkedReviewId: projectVersions.linkedReviewId,
        uploadedBy: sql<string>`(SELECT full_name FROM users WHERE id = ${projectVersions.uploadedBy})`,
        createdAt: projectVersions.createdAt,
        // Indicate if this is the current active version
        isCurrent: sql<boolean>`${projectVersions.id} = ${project.currentVersionId}`,
      })
      .from(projectVersions)
      .where(eq(projectVersions.projectId, projectId))
      .orderBy(desc(projectVersions.versionNumber));

    return res.status(200).json({
      message: "Version history fetched successfully",
      projectId,
      currentVersionId: project.currentVersionId,
      totalVersions: project.totalVersions,
      versions,
    });
  } catch (error: any) {
    console.error("Error fetching version history:", error);
    return res.status(500).json({
      message: "Failed to fetch version history",
      error: error.message,
    });
  }
};
// GET SINGLE VERSION  (download a specific version)
export const getProjectVersion = async (req: Request, res: Response) => {
  const projectId = Number(req.params.id);
  const versionNumber = Number(req.params.versionNumber);

  if (isNaN(projectId) || isNaN(versionNumber)) {
    return res.status(400).json({ message: "Invalid parameters" });
  }

  try {
    const version = await db
      .select()
      .from(projectVersions)
      .where(
        and(
          eq(projectVersions.projectId, projectId),
          eq(projectVersions.versionNumber, versionNumber),
        ),
      )
      .then((r) => r[0]);

    if (!version) {
      return res.status(404).json({ message: "Version not found" });
    }

    return res.status(200).json({
      message: "Version fetched successfully",
      version,
    });
  } catch (error: any) {
    return res.status(500).json({
      message: "Failed to fetch version",
      error: error.message,
    });
  }
};
