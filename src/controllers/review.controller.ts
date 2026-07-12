import type { Request, Response } from "express";
import {
  projects,
  reviews,
  reviewTasks,
  projectVersions,
} from "../database/schema.js";
import { and, desc, eq, inArray, not } from "drizzle-orm";
import { db } from "../config/db.js";
import { eventBus } from "../events/index.js";
import { Events } from "../utils/email/email.types.js";
import { uploadToCloudinary } from "../utils/fileUpload.js";
import cloudinary from "../config/cloudinary.js";

export const createReviewWithTasks = async (req: Request, res: Response) => {
  const { projectId, summary, tasks } = req.body;
  const supervisorId = Number((req as any).user.id);

  if (!projectId || !summary) {
    return res
      .status(400)
      .json({ message: "projectId and summary are required" });
  }

  try {
    const result = await db.transaction(async (tx) => {
      // 1. Validate project ownership
      const project = await tx.query.projects.findFirst({
        where: and(
          eq(projects.id, projectId),
          eq(projects.supervisorId, supervisorId),
        ),
      });

      if (!project) throw new Error("Project not found or access denied");

      // 2. Create review record
      const [review] = await tx
        .insert(reviews)
        .values({
          projectId,
          reviewerId: supervisorId,
          summary,
          revisionSubmitted: false,
        })
        .returning();

      // 3. Insert tasks
      if (tasks && tasks.length > 0) {
        const formattedTasks = tasks.map((t: any) => ({
          reviewId: review.id,
          projectId,
          title: t.title,
          description: t.description ?? null,
        }));
        await tx.insert(reviewTasks).values(formattedTasks);
      }

      // 4. Mark project as revision requested
      await tx
        .update(projects)
        .set({ status: "REVISION_REQUESTED", updatedAt: new Date() })
        .where(eq(projects.id, projectId));

      // 5. Fetch project + student for email
      const projectWithStudent: any = await tx.query.projects.findFirst({
        where: eq(projects.id, projectId),
        with: { student: true },
      });

      return { review, projectWithStudent };
    });

    // Fire-and-forget email
    if (result.projectWithStudent?.student?.email) {
      eventBus.emit(Events.REVIEW_CREATED, {
        studentEmail: result.projectWithStudent.student.email,
        studentName: result.projectWithStudent.student.fullName,
        projectName: result.projectWithStudent.title,
        supervisorName: (req as any).user.fullName,
        summary,
        taskCount: tasks?.length ?? 0,
      });
    }

    return res.status(201).json({
      message: "Review and tasks created successfully",
      review: result.review,
    });
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return res
      .status(500)
      .json({ message: "Failed to create review", error: message });
  }
};

// GET REVIEWS WITH TASKS FOR A PROJECT
export const getProjectReviewsWithTasks = async (
  req: Request,
  res: Response,
) => {
  const projectId = Number(req.params.projectId);

  if (!projectId || isNaN(projectId)) {
    return res.status(400).json({ message: "Invalid project id" });
  }

  try {
    // Elegant, single-query, type-safe relational retrieval
    const reviewsWithTasks = await db.query.reviews.findMany({
      where: eq(reviews.projectId, projectId),
      with: {
        tasks: true,
        revisionVersion: true,
      },
    });

    return res.status(200).json({
      message: "Reviews fetched successfully",
      data: reviewsWithTasks,
    });
  } catch (error) {
    console.error("Fetch reviews error:", error);
    return res.status(500).json({ message: "Failed to fetch project reviews" });
  }
};

// UPDATE TASK BY STUDENT  (optional evidence file)
export const updateAllReviewTasksByStudent = async (
  req: Request,
  res: Response,
) => {
  const reviewId = Number(req.params.reviewId);
  const { status, studentNote } = req.body;
  const studentId = Number((req as any).user.id);

  if (!["IN_PROGRESS", "COMPLETED"].includes(status)) {
    return res
      .status(400)
      .json({ message: "Invalid status. Use IN_PROGRESS or COMPLETED" });
  }

  if (isNaN(reviewId)) {
    return res.status(400).json({ message: "Invalid review round reference" });
  }

  try {
    const result = await db.transaction(async (tx) => {
      // 1. Validate that the review exists and belongs to this student's project
      const review = await tx.query.reviews.findFirst({
        where: eq(reviews.id, reviewId),
      });

      if (!review) throw new Error("Review round not found");

      const project = await tx.query.projects.findFirst({
        where: and(
          eq(projects.id, review.projectId),
          eq(projects.studentId, studentId),
        ),
        with: { supervisor: true },
      });

      if (!project) throw new Error("Access denied or project mismatch");

      // 2. Prepare atomic update fields
      const updateData: any = {
        status,
        studentNote: studentNote ?? null, // Overwrites or applies note to all round tasks
        updatedAt: new Date(),
      };

      if (status === "COMPLETED") {
        updateData.completedAt = new Date();
      }

      // 3. Update all unverified tasks in this specific review round in ONE query
      await tx
        .update(reviewTasks)
        .set(updateData)
        .where(
          and(
            eq(reviewTasks.reviewId, reviewId),
            not(eq(reviewTasks.status, "VERIFIED")), // Prevent overriding verified states
          ),
        );

      // 4. Fetch the total counts for the response/analytics cleanly
      const allTasks = await tx
        .select()
        .from(reviewTasks)
        .where(eq(reviewTasks.reviewId, reviewId));

      const remainingCount = allTasks.filter(
        (t) => !["COMPLETED", "VERIFIED"].includes(t.status),
      ).length;

      return {
        project,
        remainingCount,
        totalUpdated: allTasks.length,
      };
    });

    // 5. Emit a clean, single notification out-of-band if moving to COMPLETED
    if (status === "COMPLETED" && result.project?.supervisor?.email) {
      eventBus.emit(Events.TASK_SUBMITTED, {
        supervisorEmail: result.project.supervisor.email,
        supervisorName: result.project.supervisor.fullName,
        studentName: (req as any).user.fullName,
        projectName: result.project.title,
        taskTitle: `All tasks in Review Round #${reviewId} marked as completed`,
        remainingCount: result.remainingCount,
        isRoundFinished: result.remainingCount === 0,
      });
    }

    return res.status(200).json({
      message: `Successfully updated all unverified tasks in review round #${reviewId} to ${status}`,
      remainingTasks: result.remainingCount,
    });
  } catch (error: any) {
    console.error("updateAllReviewTasksByStudent error:", error);
    const code =
      error.message.includes("not found") || error.message.includes("denied")
        ? 404
        : 500;
    return res.status(code).json({
      message: "Failed to update review tasks progress",
      error: error.message,
    });
  }
};

export const submitRevisionForReview = async (req: Request, res: Response) => {
  const studentId = Number((req as any).user?.id);
  const reviewId = Number(req.params.reviewId);
  const file = req.file;
  const changeNote = req.body?.changeNote;

  if (!file) {
    return res.status(400).json({
      message: "Revised project thesis PDF document file is required",
    });
  }
  if (isNaN(reviewId)) {
    return res.status(400).json({ message: "Invalid review round reference" });
  }

  // Intercept early before processing any high-compute uploads if tasks remain open
  const tasks = await db
    .select()
    .from(reviewTasks)
    .where(eq(reviewTasks.reviewId, reviewId));
  const openTasks = tasks.filter(
    (t) => !["COMPLETED", "VERIFIED"].includes(t.status),
  );

  if (openTasks.length > 0) {
    return res.status(400).json({
      message: `Action Blocked: ${openTasks.length} task(s) are still pending completion. You must submit progress indicators for all items before bundling a new version.`,
    });
  }

  const uploadResult: any = await uploadToCloudinary(file.buffer);

  try {
    const result = await db.transaction(async (tx) => {
      const review = await tx.query.reviews.findFirst({
        where: eq(reviews.id, reviewId),
      });
      if (!review || review.revisionSubmitted) {
        throw new Error("Review round already closed or not found.");
      }

      const project = await tx.query.projects.findFirst({
        where: and(
          eq(projects.id, review.projectId),
          eq(projects.studentId, studentId),
        ),
      });
      if (!project) throw new Error("Access denied or project mismatch.");

      // Calculate the next version number cleanly
      const lastVersion = await tx
        .select()
        .from(projectVersions)
        .where(eq(projectVersions.projectId, project.id))
        .orderBy(desc(projectVersions.versionNumber))
        .limit(1);

      const nextVersionNumber = (lastVersion[0]?.versionNumber ?? 0) + 1;

      // 1. Create the structured immutable audit snapshot record
      const insertedVersion = await tx
        .insert(projectVersions)
        .values({
          projectId: project.id,
          fileUrl: uploadResult.url,
          publicId: uploadResult.publicId,
          versionNumber: nextVersionNumber,
          uploadedBy: studentId,
          changeNote:
            changeNote?.trim() ||
            `Consolidated corrections for Review Round #${reviewId}`,
          trigger: "REVISION_SUBMISSION",
          linkedReviewId: reviewId,
          fileSizeBytes: file.size,
        })
        .returning();

      // 2. Lock down the closed review cycle round
      await tx
        .update(reviews)
        .set({
          revisionVersionId: insertedVersion[0].id,
          revisionSubmitted: true,
        })
        .where(eq(reviews.id, reviewId));

      // 3. Update the primary pointer references on the top-level project catalog entry
      await tx
        .update(projects)
        .set({
          currentVersionId: insertedVersion[0].id,
          fileUrl: uploadResult.url,
          publicId: uploadResult.publicId,
          totalVersions: nextVersionNumber,
          status: "PENDING",
          updatedAt: new Date(),
        })
        .where(eq(projects.id, project.id));

      return { versionNumber: nextVersionNumber, project };
    });

    // Notify supervisor that version has dropped
    const projectWithSupervisor: any = await db.query.projects.findFirst({
      where: eq(projects.id, result.project.id),
      with: { supervisor: true },
    });

    if (projectWithSupervisor?.supervisor?.email) {
      eventBus.emit(Events.TASK_SUBMITTED, {
        supervisorEmail: projectWithSupervisor.supervisor.email,
        supervisorName: projectWithSupervisor.supervisor.fullName,
        studentName: (req as any).user.fullName,
        projectName: result.project.title,
        taskTitle: `Project Version ${result.versionNumber} Uploaded`,
        taskStatus: "REVISION_SUBMITTED",
      });
    }
    if ((req as any).user?.email) {
      eventBus.emit(Events.TASK_SUBMITTED_CONFIRMATION, {
        studentEmail: (req as any).user.email,
        studentName: (req as any).user.fullName,
        projectName: result.project.title,
        taskTitle: `Project Version ${result.versionNumber} Uploaded`,
      });
    }

    return res.status(201).json({
      message: "Revision document upload processed and stored successfully.",
      data: {
        id: result.project.currentVersionId,
        projectId: result.project.id,
        revisionVersionId: result.versionNumber,
        revisionSubmitted: true,
        reviewerId: result.project.reviewerId,
        revisionVersion: {
          versionNumber: result.versionNumber,
          changeNote: changeNote?.trim(),
          fileUrl: uploadResult.url,
          uploadedBy: studentId,
          fileSizeBytes: file.size,
          linkedReviewId: reviewId,
          createdAt: new Date(),
        },
      },
    });
  } catch (error: any) {
    if (uploadResult?.publicId) {
      await cloudinary.uploader.destroy(uploadResult.publicId);
    }
    console.error("submitRevisionForReview error:", error);
    return res
      .status(500)
      .json({ message: "Compilation pipeline failed", error: error.message });
  }
};

export const verifyReviewRoundBySupervisor = async (
  req: Request,
  res: Response,
) => {
  const reviewId = Number(req.params.reviewId);
  const supervisorId = Number((req as any).user.id);

  if (isNaN(reviewId)) {
    return res.status(400).json({ message: "Invalid review round reference" });
  }

  try {
    const result = await db.transaction(async (tx) => {
      const review = await tx.query.reviews.findFirst({
        where: eq(reviews.id, reviewId),
      });

      if (!review) throw new Error("Review round not found");

      const project = await tx.query.projects.findFirst({
        where: and(
          eq(projects.id, review.projectId),
          eq(projects.supervisorId, supervisorId),
        ),
      });

      if (!project) throw new Error("Access denied or project mismatch");

      // 1. Mark all tasks in this target review round as VERIFIED
      await tx
        .update(reviewTasks)
        .set({
          status: "VERIFIED",
          verifiedBy: supervisorId,
          verifiedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(reviewTasks.reviewId, reviewId),
            inArray(reviewTasks.status, [
              "PENDING",
              "IN_PROGRESS",
              "COMPLETED",
            ]),
          ),
        );

      // 2. Fetch all historical tasks linked to this overall project to check completeness
      const allProjectTasks = await tx.query.reviewTasks.findMany({
        where: eq(reviewTasks.projectId, project.id),
      });

      // 3. Evaluate if every single task under the project is now VERIFIED
      const isProjectFullyVerified = allProjectTasks.every(
        (task) => task.status === "VERIFIED",
      );

      // 4. If all tasks are clear, advance the top-level project status automatically
      if (isProjectFullyVerified && allProjectTasks.length > 0) {
        await tx
          .update(projects)
          .set({
            status: "VERIFIED", // The new status unlocking student publication paths
            updatedAt: new Date(),
          })
          .where(eq(projects.id, project.id));
      }

      const projectWithStudent: any = await tx.query.projects.findFirst({
        where: eq(projects.id, project.id),
        with: { student: true },
      });

      return {
        project,
        projectWithStudent,
        isProjectFullyVerified,
      };
    });

    // 5. Fire off the appropriate notification triggers based on completeness
    if (result.projectWithStudent?.student?.email) {
      if (result.isProjectFullyVerified) {
        // Notify student that the *entire project* is cleared for final publication
        eventBus.emit(Events.PROJECT_PUBLICATION, {
          studentEmail: result.projectWithStudent.student.email,
          studentName: result.projectWithStudent.student.fullName,
          projectName: result.project.title,
          supervisorName: (req as any).user.fullName || "Your Supervisor",
        });
      } else {
        // Standard notification for clearing this specific round bundle
        eventBus.emit(Events.TASK_VERIFIED, {
          studentEmail: result.projectWithStudent.student.email,
          studentName: result.projectWithStudent.student.fullName,
          projectName: result.project.title,
          taskTitle: `Review round "${reviewId}" successfully verified`,
          supervisorName: (req as any).user.fullName,
          taskStatus: "VERIFIED",
        });
      }
    }

    return res.status(200).json({
      message: result.isProjectFullyVerified
        ? "All tasks cleared. Project advanced to VERIFIED and opened for student publication."
        : "Review round bundle verified and updated successfully",
      isProjectFullyVerified: result.isProjectFullyVerified,
    });
  } catch (error: any) {
    console.error("verifyReviewRoundBySupervisor error:", error);
    return res.status(500).json({
      message: "Failed to verify review round bundle",
      error: error.message,
    });
  }
};

export const releaseProjectForPublication = async (
  req: Request,
  res: Response,
) => {
  const supervisorId = Number((req as any).user.id);
  const projectId = Number(req.params.projectId);

  try {
    const project = await db.query.projects.findFirst({
      where: and(
        eq(projects.id, projectId),
        eq(projects.supervisorId, supervisorId),
      ),
      with: { student: true },
    });

    if (!project) {
      return res
        .status(404)
        .json({ message: "Project context profile not found." });
    }

    // Guard: Prevent double-execution if it is already published
    if (project.status === "APPROVED") {
      return res
        .status(400)
        .json({ message: "This project is already permanently published." });
    }

    // Update the state mapping directly to VERIFIED
    await db
      .update(projects)
      .set({
        status: "VERIFIED",
        updatedAt: new Date(),
      })
      .where(eq(projects.id, projectId));

    if (project.student?.email) {
      eventBus.emit(Events.PROJECT_PUBLICATION, {
        studentEmail: project.student.email,
        studentName: project.student.fullName,
        projectName: project.title,
        supervisorName: (req as any).user.fullName || "Your Supervisor",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "Project status advanced to VERIFIED. Unlocked student publication paths.",
    });
  } catch (error: any) {
    return res
      .status(500)
      .json({ message: "Execution error", error: error.message });
  }
};

// UPDATE PROJECT STATUS  (supervisor — requires all tasks VERIFIED)
export const updateProjectStatus = async (req: Request, res: Response) => {
  const supervisorId = Number((req as any).user.id);
  const projectId = Number(req.params.id);
  const { status } = req.body as {
    status: "APPROVED" | "REJECTED" | "REVISION_REQUESTED";
  };

  const validStatuses = ["APPROVED", "REJECTED", "REVISION_REQUESTED"];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ message: "Invalid status value" });
  }

  try {
    const project = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId));

    if (!project.length || project[0].supervisorId !== supervisorId) {
      return res
        .status(403)
        .json({ message: "You cannot update this project" });
    }

    // Block APPROVED if unverified tasks remain
    if (status === "APPROVED") {
      const unverifiedTasks = await db
        .select()
        .from(reviewTasks)
        .where(
          and(
            eq(reviewTasks.projectId, projectId),
            not(eq(reviewTasks.status, "VERIFIED")),
          ),
        );

      if (unverifiedTasks.length > 0) {
        return res.status(400).json({
          message: `Cannot approve: ${unverifiedTasks.length} task(s) not yet verified`,
        });
      }
    }

    await db
      .update(projects)
      .set({ status, updatedAt: new Date() })
      .where(eq(projects.id, projectId));

    return res
      .status(200)
      .json({ message: "Project status updated successfully" });
  } catch (error) {
    console.error("Error updating project status:", error);
    return res
      .status(500)
      .json({ message: "Failed to update project status", error });
  }
};
// DELETE TASK
export const deleteTask = async (req: Request, res: Response) => {
  const { taskId } = req.params;

  try {
    const existingTask = await db.query.reviewTasks.findFirst({
      where: eq(reviewTasks.id, Number(taskId)),
    });
    if (!existingTask)
      return res.status(404).json({ message: "Task not found" });

    await db.delete(reviewTasks).where(eq(reviewTasks.id, Number(taskId)));
    return res.status(200).json({ message: "Task deleted successfully" });
  } catch (error) {
    console.error("Error deleting task:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
// DELETE REVIEW
export const deleteReview = async (req: Request, res: Response) => {
  const { reviewId } = req.params;

  try {
    const existingReview = await db.query.reviews.findFirst({
      where: eq(reviews.id, Number(reviewId)),
    });
    if (!existingReview) {
      return res.status(404).json({ message: "Review round not found" });
    }

    await db.transaction(async (tx) => {
      await tx
        .delete(reviewTasks)
        .where(eq(reviewTasks.reviewId, Number(reviewId)));

      await tx.delete(reviews).where(eq(reviews.id, Number(reviewId)));
    });

    return res.status(200).json({
      message: "Review round and all associated tasks deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting review:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
