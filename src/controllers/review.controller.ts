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
    const project = await db.query.projects.findFirst({
      where: eq(projects.id, projectId),
    });
    if (!project) return res.status(404).json({ message: "Project not found" });

    const reviewsData = await db.query.reviews.findMany({
      where: eq(reviews.projectId, projectId),
    });

    const reviewIds = reviewsData.map((r) => r.id);

    // Fetch tasks for all reviews in one query
    const tasksData =
      reviewIds.length > 0
        ? await db.query.reviewTasks.findMany({
            where: inArray(reviewTasks.reviewId, reviewIds),
          })
        : [];

    // Fetch revision versions linked to each review
    const revisionVersionIds = reviewsData
      .map((r) => r.revisionVersionId)
      .filter(Boolean) as number[];

    const revisionVersions =
      revisionVersionIds.length > 0
        ? await db
            .select()
            .from(projectVersions)
            .where(inArray(projectVersions.id, revisionVersionIds))
        : [];

    const revisionMap = new Map(revisionVersions.map((v) => [v.id, v]));

    // Attach tasks and revision version to each review
    const reviewsWithTasks = reviewsData.map((r) => ({
      ...r,
      tasks: tasksData.filter((t) => t.reviewId === r.id),
      revisionVersion: r.revisionVersionId
        ? (revisionMap.get(r.revisionVersionId) ?? null)
        : null,
    }));

    if (reviewsWithTasks.length === 0) {
      return res.status(200).json({
        message: "No reviews yet for this project",
        data: [],
      });
    }

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
export const updateTaskByStudent = async (req: Request, res: Response) => {
  const { taskId } = req.params;
  const { status, studentNote } = req.body;
  const file = req.file; // optional evidence file

  if (!["IN_PROGRESS", "COMPLETED"].includes(status)) {
    return res
      .status(400)
      .json({ message: "Invalid status. Use IN_PROGRESS or COMPLETED" });
  }

  let evidenceUpload: any;

  try {
    const task = await db.query.reviewTasks.findFirst({
      where: eq(reviewTasks.id, Number(taskId)),
    });

    if (!task) return res.status(404).json({ message: "Task not found" });

    // Cannot update a VERIFIED task
    if (task.status === "VERIFIED") {
      return res.status(400).json({ message: "Cannot update a verified task" });
    }

    // Upload optional evidence file when marking COMPLETED
    if (file && status === "COMPLETED") {
      evidenceUpload = await uploadToCloudinary(file.buffer);
    }

    const updateData: any = {
      status,
      studentNote: studentNote ?? task.studentNote,
      updatedAt: new Date(),
    };

    if (status === "COMPLETED") {
      updateData.completedAt = new Date();
    }

    if (evidenceUpload) {
      updateData.evidenceFileUrl = evidenceUpload.url;
      updateData.evidencePublicId = evidenceUpload.publicId;
    }

    const [updatedTask] = await db
      .update(reviewTasks)
      .set(updateData)
      .where(eq(reviewTasks.id, Number(taskId)))
      .returning();

    // Emit emails when task is COMPLETED
    if (updatedTask.status === "COMPLETED") {
      const project: any = await db.query.projects.findFirst({
        where: eq(projects.id, task.projectId),
        with: { supervisor: true, student: true },
      });

      if (project?.supervisor?.email) {
        eventBus.emit(Events.TASK_SUBMITTED, {
          supervisorEmail: project.supervisor.email,
          supervisorName: project.supervisor.fullName,
          studentName: (req as any).user.fullName,
          projectName: project.title,
          taskTitle: task.title,
          taskStatus: updatedTask.status,
        });
      }

      if ((req as any).user?.email) {
        eventBus.emit(Events.TASK_SUBMITTED_CONFIRMATION, {
          studentEmail: (req as any).user.email,
          studentName: (req as any).user.fullName,
          projectName: project?.title,
          taskTitle: task.title,
        });
      }
    }

    return res.status(200).json({
      message: "Task updated successfully",
      task: updatedTask,
    });
  } catch (error: any) {
    // Rollback evidence upload on failure
    if (evidenceUpload?.publicId) {
      await cloudinary.uploader.destroy(evidenceUpload.publicId);
    }
    console.error("updateTaskByStudent error:", error);
    return res
      .status(500)
      .json({ message: "Failed to update task", error: error.message });
  }
};
// SUBMIT REVISION FILE  (student — after completing all tasks)
export const submitRevisionForReview = async (req: Request, res: Response) => {
  const studentId = Number((req as any).user?.id);
  const reviewId = Number(req.params.reviewId);
  const file = req.file;
  const changeNote = req.body?.changeNote;

  if (!file) {
    return res.status(400).json({ message: "Revised PDF file is required" });
  }
  if (file.size > 20 * 1024 * 1024) {
    return res.status(400).json({ message: "File size must be < 20MB" });
  }
  if (isNaN(reviewId)) {
    return res.status(400).json({ message: "Invalid review id" });
  }

  let uploadResult: any;

  try {
    const result = await db.transaction(async (tx) => {
      // 1. Load review
      const review = await tx.query.reviews.findFirst({
        where: eq(reviews.id, reviewId),
      });
      if (!review) throw new Error("Review not found");

      // 2. Load project and confirm student ownership
      const project = await tx.query.projects.findFirst({
        where: and(
          eq(projects.id, review.projectId),
          eq(projects.studentId, studentId),
        ),
      });
      if (!project) throw new Error("Access denied or project not found");

      // 3. Confirm revision hasn't already been submitted for this review
      if (review.revisionSubmitted) {
        throw new Error(
          "Revision already submitted for this review round. Ask your supervisor to create a new review.",
        );
      }

      // 4. Confirm ALL tasks in this review are at least COMPLETED (not PENDING/IN_PROGRESS)
      const tasks = await tx.query.reviewTasks.findMany({
        where: eq(reviewTasks.reviewId, reviewId),
      });

      const incompleteTasks = tasks.filter(
        (t) => !["COMPLETED", "VERIFIED"].includes(t.status),
      );
      if (incompleteTasks.length > 0) {
        throw new Error(
          `${incompleteTasks.length} task(s) not yet completed. Complete all tasks before submitting a revision.`,
        );
      }

      // 5. Upload file
      uploadResult = await uploadToCloudinary(file.buffer);

      // 6. Determine next version number
      const lastVersion = await tx
        .select()
        .from(projectVersions)
        .where(eq(projectVersions.projectId, project.id))
        .orderBy(desc(projectVersions.versionNumber))
        .limit(1);

      const nextVersionNumber = (lastVersion[0]?.versionNumber ?? 0) + 1;

      // 7. Insert new version — REVISION_SUBMISSION trigger
      const inserted = await tx
        .insert(projectVersions)
        .values({
          projectId: project.id,
          fileUrl: uploadResult.url,
          publicId: uploadResult.publicId,
          versionNumber: nextVersionNumber,
          uploadedBy: studentId,
          changeNote:
            changeNote?.trim() || `Revision for review round #${reviewId}`,
          trigger: "REVISION_SUBMISSION",
          linkedReviewId: reviewId,
          fileSizeBytes: file.size,
        })
        .returning();

      const version = Array.isArray(inserted) ? inserted[0] : (inserted as any);

      // 8. Link version to the review record
      await tx
        .update(reviews)
        .set({ revisionVersionId: version.id, revisionSubmitted: true })
        .where(eq(reviews.id, reviewId));

      // 9. Update project's current version and file references
      await tx
        .update(projects)
        .set({
          currentVersionId: version.id,
          fileUrl: uploadResult.url,
          publicId: uploadResult.publicId,
          totalVersions: nextVersionNumber,
          updatedAt: new Date(),
        })
        .where(eq(projects.id, project.id));

      return { version, versionNumber: nextVersionNumber, project };
    });

    // Notify supervisor that revision has been submitted
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
        taskTitle: `Revision v${result.versionNumber} submitted`,
        taskStatus: "SUBMITTED",
      });
    }

    return res.status(201).json({
      message: "Revision submitted successfully",
      versionNumber: result.versionNumber,
      version: result.version,
    });
  } catch (error: any) {
    if (uploadResult?.publicId) {
      await cloudinary.uploader.destroy(uploadResult.publicId);
    }
    console.error("submitRevisionForReview error:", error);
    return res.status(500).json({
      message: "Revision submission failed",
      error: error.message,
    });
  }
};
// VERIFY TASK BY SUPERVISOR
export const verifyTaskBySupervisor = async (req: Request, res: Response) => {
  const { taskId } = req.params;
  const supervisorId = Number((req as any).user.id);

  try {
    const task = await db.transaction(async (tx) => {
      const t = await tx.query.reviewTasks.findFirst({
        where: eq(reviewTasks.id, Number(taskId)),
      });
      if (!t) throw new Error("Task not found");
      if (t.status !== "COMPLETED")
        throw new Error("Task must be COMPLETED before it can be verified");

      const [updatedTask] = await tx
        .update(reviewTasks)
        .set({
          status: "VERIFIED",
          verifiedBy: supervisorId,
          verifiedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(reviewTasks.id, Number(taskId)))
        .returning();

      // Check if all tasks for this project are now verified
      const reviewTasksForReview = await tx.query.reviewTasks.findMany({
        where: eq(reviewTasks.reviewId, t.reviewId),
      });

      const allVerified = reviewTasksForReview.every(
        (task) => task.status === "VERIFIED",
      );
      if (allVerified) {
        await tx
          .update(projects)
          .set({
            status: "APPROVED",
            updatedAt: new Date(),
          })
          .where(eq(projects.id, t.projectId));
      }

      return updatedTask;
    });

    // Notify student
    const projectWithStudent: any = await db.query.projects.findFirst({
      where: eq(projects.id, task.projectId),
      with: { student: true },
    });

    if (projectWithStudent?.student?.email) {
      eventBus.emit(Events.TASK_VERIFIED, {
        studentEmail: projectWithStudent.student.email,
        studentName: projectWithStudent.student.fullName,
        projectName: projectWithStudent.title,
        taskTitle: task.title,
        supervisorName: (req as any).user.fullName,
        taskStatus: task.status,
      });
    }

    return res
      .status(200)
      .json({ message: "Task verified successfully", task });
  } catch (err) {
    console.error(err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return res
      .status(500)
      .json({ message: "Failed to verify task", error: message });
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

    // Clean up evidence file from Cloudinary if it exists
    if (existingTask.evidencePublicId) {
      await cloudinary.uploader.destroy(existingTask.evidencePublicId);
    }

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
      // Fetch and clean up evidence files
      const tasks = await tx.query.reviewTasks.findMany({
        where: eq(reviewTasks.reviewId, Number(reviewId)),
      });
      for (const t of tasks) {
        if (t.evidencePublicId) {
          await cloudinary.uploader.destroy(t.evidencePublicId);
        }
      }

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
