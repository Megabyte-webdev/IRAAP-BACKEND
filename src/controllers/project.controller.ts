import type { Request, Response } from "express";
import { db } from "../config/db.js";
import {
  categories,
  metadata,
  projects,
  projectVersions,
  users,
} from "../database/schema.js";
import { uploadToCloudinary } from "../utils/fileUpload.js";
import { and, desc, eq, ilike, sql } from "drizzle-orm";
import cloudinary from "../config/cloudinary.js";
import { z } from "zod";
import { withPagination } from "../utils/pagination.js";
import {
  errorResponse,
  getAuthUser,
  sanitizeString,
  verifyProjectOwnership,
} from "../utils/helper.js";

const projectSchema = z.object({
  title: z.string().min(1, "Title is required"),
  abstract: z.string().min(1, "Abstract is required"),
  submissionYear: z.preprocess((val) => Number(val), z.number().int()),
  categoryId: z.preprocess((val) => Number(val), z.number().int()),
  methodology: z.string().min(1, "Methodology is required"),
  researchArea: z.string().optional().default(""),
  keywords: z
    .array(z.string())
    .transform((arr) => arr.map((k) => sanitizeString(k))),
});

// ENDPOINTS

export const submitProject = async (req: Request, res: Response) => {
  const authUser = getAuthUser(req);
  if (!authUser) {
    return errorResponse(res, 401, "User ID not found in request");
  }

  const studentId = authUser.id;
  const supervisorId = authUser.supervisorId;
  const file = req.file;

  if (!file) {
    return errorResponse(res, 400, "No PDF file provided");
  }

  if (file.size > 20 * 1024 * 1024) {
    return errorResponse(res, 400, "File size must be < 20MB");
  }

  let parsed;
  try {
    parsed = projectSchema.parse(req.body);
  } catch (err: any) {
    return errorResponse(
      res,
      400,
      `Validation error: ${err.errors?.[0]?.message || "Invalid input"}`,
    );
  }

  // Sanitize strings
  parsed.title = sanitizeString(parsed.title);
  parsed.abstract = sanitizeString(parsed.abstract);
  parsed.methodology = sanitizeString(parsed.methodology);
  parsed.researchArea = sanitizeString(parsed.researchArea);

  let uploadResult: any;
  try {
    uploadResult = await uploadToCloudinary(file.buffer);
  } catch (error) {
    console.log("Cloudinary upload failed:", error);
    return errorResponse(res, 500, "File upload failed");
  }

  try {
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
          fileUrl: uploadResult.url,
          totalVersions: 1,
          updatedAt: new Date(),
        })
        .returning() as Promise<any[]>);

      const [version] = await (tx
        .insert(projectVersions)
        .values({
          projectId: project.id,
          fileUrl: uploadResult.url,
          versionNumber: 1,
          uploadedBy: studentId,
          changeNote: "Initial submission",
          trigger: "INITIAL_SUBMISSION",
          fileSizeBytes: file.size,
        })
        .returning() as Promise<any[]>);

      await tx
        .update(projects)
        .set({ currentVersionId: version.id })
        .where(eq(projects.id, project.id));

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
    console.log("Submission error:", error);
    if (uploadResult?.publicId) {
      try {
        await cloudinary.uploader.destroy(uploadResult.publicId);
      } catch (cleanupError) {
        console.log("Failed to cleanup Cloudinary file:", cleanupError);
      }
    }
    return errorResponse(res, 500, "Submission failed");
  }
};

export const updateProject = async (req: Request, res: Response) => {
  const authUser = getAuthUser(req);
  if (!authUser) {
    return errorResponse(res, 401, "User ID not found in request");
  }

  const projectId = Number(req.params.id);
  const studentId = authUser.id;
  const supervisorId = authUser.supervisorId;
  const file = req.file;

  if (isNaN(projectId)) {
    return errorResponse(res, 400, "Invalid project ID");
  }

  // Verify ownership
  const ownsProject = await verifyProjectOwnership(projectId, studentId);
  if (!ownsProject) {
    return errorResponse(res, 403, "You can only update your own projects");
  }

  let parsed;
  try {
    parsed = projectSchema.parse(req.body);
  } catch (err: any) {
    return errorResponse(
      res,
      400,
      `Validation error: ${err.errors?.[0]?.message || "Invalid input"}`,
    );
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

      if (!project) {
        throw new Error("Project not found");
      }

      let newVersionId = project.currentVersionId;
      let newTotalVersions = project.totalVersions;

      // Create new version only if file provided
      if (file) {
        try {
          uploadResult = await uploadToCloudinary(file.buffer);
        } catch (error) {
          throw new Error("File upload failed");
        }

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
            versionNumber: nextVersion,
            uploadedBy: studentId,
            changeNote: req.body.changeNote || "Student update",
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
          ...(uploadResult && {
            fileUrl: uploadResult.url,
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
    console.log("Update error:", error);
    if (uploadResult?.publicId) {
      try {
        await cloudinary.uploader.destroy(uploadResult.publicId);
      } catch (cleanupError) {
        console.log("Failed to cleanup Cloudinary file:", cleanupError);
      }
    }
    return errorResponse(res, 500, "Project update failed");
  }
};

export const getStudentSubmissions = async (req: Request, res: Response) => {
  const authUser = getAuthUser(req);
  if (!authUser) {
    return errorResponse(res, 401, "User ID not found in request");
  }

  const studentId = authUser.id;

  try {
    const submissions = await db
      .select({
        id: projects.id,
        title: projects.title,
        abstract: projects.abstract,
        submissionYear: projects.submissionYear,
        isSignaledForPublication: projects.isSignaledForPublication,
        status: projects.status,
        categoryId: projects.categoryId,
        category: categories.name,
        totalVersions: projects.totalVersions,
        createdAt: projects.createdAt,
        updatedAt: projects.updatedAt,
      })
      .from(projects)
      .innerJoin(categories, eq(projects.categoryId, categories.id))
      .where(eq(projects.studentId, studentId))
      .orderBy(desc(projects.createdAt));

    return res.status(200).json({
      message: "Student submissions fetched successfully",
      count: submissions.length,
      projects: submissions,
    });
  } catch (error) {
    console.log("Fetch submissions error:", error);
    return errorResponse(res, 500, "Error fetching student submissions");
  }
};
export const getProjectDetails = async (req: Request, res: Response) => {
  const projectId = Number(req.params.id);

  if (isNaN(projectId)) {
    return errorResponse(res, 400, "Invalid project ID");
  }

  try {
    const project = await db.query.projects.findMany({
      where: eq(projects.id, projectId),
      with: {
        student: true,
        supervisor: true,
        reviews: true,
        versions: true,
        currentVersion: true,
      },
    });

    if (!project) {
      return errorResponse(res, 404, "Project not found");
    }

    return res.status(200).json({
      message: "Project details fetched successfully",
      project,
    });
  } catch (error) {
    console.log("Fetch project details error:", error);
    return errorResponse(
      res,
      500,
      error instanceof Error ? error.message : "Unknown database error",
    );
  }
};

export const getProjectVersionHistory = async (req: Request, res: Response) => {
  const authUser = getAuthUser(req);
  if (!authUser) {
    return errorResponse(res, 401, "User ID not found in request");
  }

  const projectId = Number(req.params.id);
  const studentId = authUser.id;

  if (isNaN(projectId)) {
    return errorResponse(res, 400, "Invalid project ID");
  }

  try {
    // Verify ownership
    const project = await db.query.projects.findFirst({
      where: and(eq(projects.id, projectId), eq(projects.studentId, studentId)),
      columns: {
        id: true,
        currentVersionId: true,
        totalVersions: true,
      },
    });

    if (!project) {
      return errorResponse(
        res,
        403,
        "You can only view history for your own projects",
      );
    }

    console.log({
      id: projectVersions.id,
      versionNumber: projectVersions.versionNumber,
      fileUrl: projectVersions.fileUrl,
      publicId: projectVersions.publicId,
      changeNote: projectVersions.changeNote,
      trigger: projectVersions.trigger,
      fileSizeBytes: projectVersions.fileSizeBytes,
      linkedReviewId: projectVersions.linkedReviewId,
      uploadedBy: users.fullName,
      createdAt: projectVersions.createdAt,
    });

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
        uploadedBy: users.fullName,
        createdAt: projectVersions.createdAt,
      })
      .from(projectVersions)
      .innerJoin(users, eq(projectVersions.uploadedBy, users.id))
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
    console.log("Fetch version history error:", error);
    return errorResponse(res, 500, "Failed to fetch version history");
  }
};

export const getProjectVersion = async (req: Request, res: Response) => {
  const authUser = getAuthUser(req);
  if (!authUser) {
    return errorResponse(res, 401, "User ID not found in request");
  }

  const projectId = Number(req.params.id);
  const versionNumber = Number(req.params.versionNumber);
  const studentId = authUser.id;

  if (isNaN(projectId) || isNaN(versionNumber)) {
    return errorResponse(res, 400, "Invalid parameters");
  }

  try {
    // Verify ownership first
    const project = await db.query.projects.findFirst({
      where: and(eq(projects.id, projectId), eq(projects.studentId, studentId)),
      columns: { id: true },
    });

    if (!project) {
      return errorResponse(
        res,
        403,
        "You can only access your own project versions",
      );
    }

    const version = await db
      .select({
        id: projectVersions.id,
        versionNumber: projectVersions.versionNumber,
        fileUrl: projectVersions.fileUrl,
        publicId: projectVersions.publicId,
        changeNote: projectVersions.changeNote,
        trigger: projectVersions.trigger,
        fileSizeBytes: projectVersions.fileSizeBytes,
        linkedReviewId: projectVersions.linkedReviewId,
        uploadedBy: users.fullName,
        createdAt: projectVersions.createdAt,
      })
      .from(projectVersions)
      .innerJoin(users, eq(projectVersions.uploadedBy, users.id))
      .where(
        and(
          eq(projectVersions.projectId, projectId),
          eq(projectVersions.versionNumber, versionNumber),
        ),
      )
      .then((r) => r[0]);

    if (!version) {
      return errorResponse(res, 404, "Version not found");
    }

    return res.status(200).json({
      message: "Version fetched successfully",
      version,
    });
  } catch (error: any) {
    console.log("Fetch version error:", error);
    return errorResponse(res, 500, "Failed to fetch version");
  }
};

export const getAllProjects = async (req: Request, res: Response) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;

    const {
      title,
      year,
      researchArea,
      methodology,
      categoryId,
      status = "APPROVED",
      researchType,
      keyword,
    } = req.query;

    const conditions = [
      eq(projects.status, status as any),

      categoryId ? eq(projects.categoryId, Number(categoryId)) : undefined,

      title ? ilike(projects.title, `%${String(title).trim()}%`) : undefined,

      year ? eq(projects.submissionYear, Number(year)) : undefined,

      researchArea
        ? ilike(metadata.researchArea, `%${String(researchArea).trim()}%`)
        : undefined,

      methodology
        ? ilike(metadata.methodology, `%${String(methodology).trim()}%`)
        : undefined,

      researchType ? eq(projects.researchType, researchType as any) : undefined,

      // Keyword filter
      keyword
        ? Array.isArray(keyword)
          ? sql`${metadata.keywords} && ARRAY[
              ${sql.join(
                keyword.map((k) => sql`${String(k).trim()}::text`),
                sql`, `,
              )}
            ]::text[]`
          : sql`${metadata.keywords} @> ARRAY[
              ${String(keyword).trim()}::text
            ]::text[]`
        : undefined,
    ];

    const whereClause = and(...conditions.filter(Boolean));

    const result = await withPagination({
      page,
      limit,

      countQuery: db
        .select({
          count: sql<number>`cast(count(*) as integer)`,
        })
        .from(projects)
        .leftJoin(metadata, eq(projects.id, metadata.projectId))
        .where(whereClause),

      dataQuery: (limit, offset) =>
        db
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
            researchType: projects.researchType,
            methodology: metadata.methodology,
            totalVersions: projects.totalVersions,
            author: users.fullName,
            createdAt: projects.createdAt,
            updatedAt: projects.updatedAt,
          })
          .from(projects)
          .leftJoin(categories, eq(projects.categoryId, categories.id))
          .leftJoin(metadata, eq(projects.id, metadata.projectId))
          .leftJoin(users, eq(projects.studentId, users.id))
          .where(whereClause)
          .orderBy(desc(projects.updatedAt))
          .limit(limit)
          .offset(offset),
    });

    return res.status(200).json({
      message: "Projects fetched successfully",
      ...result,
    });
  } catch (error) {
    console.log(error);
    return errorResponse(res, 500, "Error fetching projects");
  }
};
