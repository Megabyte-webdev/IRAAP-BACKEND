import type { Request, Response } from "express";
import { db } from "../config/db.js";
import {
  projects,
  metadata,
  publicationRequests,
  researchTypeEnum,
} from "../database/schema.js";
import { eq, desc } from "drizzle-orm";
import { uploadToCloudinary } from "../utils/fileUpload.js";
import z from "zod";
import { errorResponse, getAuthUser, sanitizeString } from "../utils/helper.js";

const publicationSchema = z.object({
  title: z.string().min(1, "Title is required"),
  abstract: z.string().min(1, "Abstract is required"),
  methodology: z.string().min(1, "Methodology is required"),
  researchArea: z.string().optional().default(""),
  keywords: z
    .array(z.string())
    .transform((arr) => arr.map((k) => sanitizeString(k))),
  researchType: z.enum([
    "BSC_PROJECT",
    "MSC_THESIS",
    "PHD_DISSERTATION",
    "JOURNAL",
    "INDEPENDENT_RESEARCH",
  ]),
});

// CREATE PUBLICATION REQUEST
export const createPublicationRequest = async (req: Request, res: Response) => {
  const authUser = getAuthUser(req);
  const userId = authUser.id;
  const file = req.file;

  if (!authUser) {
    return errorResponse(res, 401, "Unauthorized access");
  }

  if (!file) {
    return errorResponse(res, 400, "Research file required");
  }

  if (file.mimetype !== "application/pdf") {
    return errorResponse(res, 400, "Only PDF files allowed");
  }

  if (file.size > 20 * 1024 * 1024) {
    return errorResponse(res, 400, "File size must be < 20MB");
  }

  let uploadResult: any;
  try {
    uploadResult = await uploadToCloudinary(file.buffer);
  } catch (error) {
    console.error("Cloudinary upload failed:", error);
    return errorResponse(res, 500, "File upload failed");
  }

  try {
    const parsed = publicationSchema.parse(req.body);

    if (!uploadResult?.url || !uploadResult?.publicId) {
      return errorResponse(res, 500, "File upload failed");
    }

    parsed.title = sanitizeString(parsed.title);
    parsed.abstract = sanitizeString(parsed.abstract);
    parsed.methodology = sanitizeString(parsed.methodology);
    parsed.researchArea = sanitizeString(parsed.researchArea);

    const [publication] = await db
      .insert(publicationRequests)
      .values({
        requesterId: userId,
        title: parsed.title,
        abstract: parsed.abstract,
        fileUrl: uploadResult.url,
        publicId: uploadResult.publicId,
        researchType: parsed.researchType,
        keywords: parsed.keywords,
        researchArea: parsed.researchArea,
        methodology: parsed.methodology,
        status: "PENDING",
      })
      .returning();

    return res.status(201).json({
      message: "Publication request submitted successfully",
      publication,
    });
  } catch (err: any) {
    console.error("Create publication request error:", err);
    if (err instanceof z.ZodError) {
      return errorResponse(res, 400, err.message);
    }
    return errorResponse(res, 500, "Internal server error");
  }
};

// GET USER PUBLICATION REQUESTS
export const getMyPublications = async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;

  if (!userId) {
    return errorResponse(res, 401, "Unauthorized access");
  }

  try {
    const publications = await db
      .select()
      .from(publicationRequests)
      .where(eq(publicationRequests.requesterId, userId))
      .orderBy(desc(publicationRequests.createdAt));

    return res.status(200).json({ publications });
  } catch (error) {
    console.error("Get my publications error:", error);
    return errorResponse(res, 500, "Internal server error");
  }
};
// GET PENDING PUBLICATION REQUESTS (ADMIN)
export const getPendingPublications = async (req: Request, res: Response) => {
  try {
    const publications = await db.query.publicationRequests.findMany({
      where: eq(publicationRequests.status, "PENDING"),
      orderBy: [desc(publicationRequests.createdAt)],
      with: {
        requester: {
          columns: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });

    return res.status(200).json({
      message: "Pending publications fetched successfully",
      publications,
    });
  } catch (error) {
    console.error("Get pending publications error:", error);

    return errorResponse(res, 500, "Failed to fetch pending publications");
  }
};

// REJECT PUBLICATION REQUEST
export const rejectPublication = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const { adminNote } = req.body;

  if (isNaN(id)) {
    return errorResponse(res, 400, "Invalid publication id");
  }

  try {
    const [updated] = await db
      .update(publicationRequests)
      .set({
        status: "REJECTED",
        adminNote: adminNote || null,
        updatedAt: new Date(),
      })
      .where(eq(publicationRequests.id, id))
      .returning();

    if (!updated) {
      return errorResponse(res, 404, "Publication request not found");
    }

    return res.status(200).json({
      message: "Publication rejected successfully",
      publication: updated,
    });
  } catch (error) {
    console.error("Reject publication error:", error);
    return errorResponse(res, 500, "Internal server error");
  }
};

export const approvePublication = async (req: Request, res: Response) => {
  const publicationId = Number(req.params.id);
  const adminId = (req as any).user?.id;

  if (isNaN(publicationId)) {
    return errorResponse(res, 400, "Invalid publication id");
  }

  try {
    const publicationRequest = await db.query.publicationRequests.findFirst({
      where: eq(publicationRequests.id, publicationId),
    });

    if (!publicationRequest) {
      return errorResponse(res, 404, "Publication request not found");
    }

    if (publicationRequest.status !== "PENDING") {
      return errorResponse(
        res,
        400,
        "Only pending publications can be approved",
      );
    }

    const updatedPublication = await db.transaction(async (tx) => {
      // Step A: Convert request parameters into verified archive project item
      const [newProject] = (await tx
        .insert(projects)
        .values({
          title: publicationRequest.title,
          abstract: publicationRequest.abstract,
          fileUrl: publicationRequest.fileUrl,
          publicId: publicationRequest.publicId,
          studentId: publicationRequest.requesterId,
          researchType: "JOURNAL",
          status: "APPROVED",
          submissionYear: new Date().getFullYear(),
        })
        .returning()) as any;

      await tx.insert(metadata).values({
        projectId: newProject.id,
        keywords: publicationRequest.keywords,
        researchArea: publicationRequest.researchArea,
        methodology: publicationRequest.methodology,
      });

      const [targetRequest] = await tx
        .update(publicationRequests)
        .set({
          projectId: newProject.id,
          status: "APPROVED",
          publishedAt: new Date(),
          approvedBy: adminId,
          updatedAt: new Date(),
        })
        .where(eq(publicationRequests.id, publicationId))
        .returning();

      return targetRequest;
    });

    return res.status(200).json({
      message:
        "Publication approved successfully and added to institutional archive",
      publication: updatedPublication,
    });
  } catch (error) {
    console.error("Approve publication error:", error);
    return errorResponse(res, 500, "Failed to approve publication");
  }
};
