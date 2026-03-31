import type { Request, Response } from "express";
import { projects, reviews, reviewTasks } from "../database/schema.js";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "../config/db.js";
import { sendEmail } from "../services/mail.js";
import { getEmailData } from "../utils/email/engine.js";
import { eventBus } from "../events/index.js";
import { Events } from "../utils/email/email.types.js";

export const createReviewWithTasks = async (req: Request, res: Response) => {
  const { projectId, summary, tasks } = req.body;
  const supervisorId = Number((req as any).user.userId);

  try {
    const result = await db.transaction(async (tx) => {
      // 1. Validate project ownership
      const project = await tx.query.projects.findFirst({
        where: and(
          eq(projects.id, projectId),
          eq(projects.supervisorId, supervisorId),
        ),
      });

      if (!project) {
        throw new Error("Project not found or access denied");
      }

      // 2. Create review
      const [review] = await tx
        .insert(reviews)
        .values({
          projectId,
          reviewerId: supervisorId,
          summary,
        })
        .returning();

      // 3. Insert tasks
      if (tasks && tasks.length > 0) {
        const formattedTasks = tasks.map((t: any) => ({
          reviewId: review.id,
          projectId,
          title: t.title,
          description: t.description,
        }));

        await tx.insert(reviewTasks).values(formattedTasks);
      }

      // 4. Set project to revision requested
      await tx
        .update(projects)
        .set({ status: "REVISION_REQUESTED" })
        .where(eq(projects.id, projectId));

      const projectWithStudent: any = await tx.query.projects.findFirst({
        where: eq(projects.id, projectId),
        with: { student: true },
      });
      return { review, projectWithStudent };
    });

    // FIRE-AND-FORGET EMAIL (Doesn't block the API response)
    if (result.projectWithStudent?.student?.email) {
      const payload = {
        studentEmail: result.projectWithStudent.student.email,
        studentName: result.projectWithStudent.student.fullName,
        projectName: result.projectWithStudent.title,
        supervisorName: (req as any).user.fullName,
        summary,
        taskCount: tasks.length,
      };
      eventBus.emit(Events.REVIEW_CREATED, payload);
      console.log("emitting event", payload);
    }

    res.status(201).json({
      message: "Review and tasks created successfully",
      review: result,
    });
  } catch (error) {
    console.error(error);

    // Ensure error is an instance of Error
    const message = error instanceof Error ? error.message : "Unknown error";

    res.status(500).json({
      message: "Failed to create review",
      error: message,
    });
  }
};

export const getProjectReviewsWithTasks = async (
  req: Request,
  res: Response,
) => {
  const projectId = Number(req.params.projectId);

  // Validate id
  if (!projectId || isNaN(projectId)) {
    return res.status(400).json({
      message: "Invalid project id",
    });
  }

  try {
    // Check if project exists
    const project = await db.query.projects.findFirst({
      where: eq(projects.id, projectId),
    });

    if (!project) {
      return res.status(404).json({
        message: "Project not found",
      });
    }

    const reviewsData = await db.query.reviews.findMany({
      where: eq(reviews.projectId, projectId),
    });

    // fetch tasks manually
    const reviewIds = reviewsData.map((r) => r.id);
    const tasksData = await db.query.reviewTasks.findMany({
      where: inArray(reviewTasks.reviewId, reviewIds),
    });

    // attach tasks
    const reviewsWithTasks = reviewsData.map((r) => ({
      ...r,
      tasks: tasksData.filter((t) => t.reviewId === r.id),
    }));

    // No reviews yet
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

    return res.status(500).json({
      message: "Failed to fetch project reviews",
    });
  }
};

export const updateTaskByStudent = async (req: Request, res: Response) => {
  const { taskId } = req.params;
  const { status, studentNote, userId } = req.body;

  try {
    const task = await db.query.reviewTasks.findFirst({
      where: eq(reviewTasks.id, Number(taskId)),
    });

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    if (!["IN_PROGRESS", "COMPLETED"].includes(status)) {
      return res.status(400).json({
        message: "Invalid status update",
      });
    }

    const updateData: any = {
      status,
      studentNote,
      updatedAt: new Date(),
    };

    if (status === "COMPLETED") {
      updateData.completedAt = new Date();
    }

    const [updatedTask] = await db
      .update(reviewTasks)
      .set(updateData)
      .where(eq(reviewTasks.id, Number(taskId)))
      .returning();

    // Emit event for email to supervisor
    const project: any = await db.query.projects.findFirst({
      where: eq(projects.id, task.projectId),
      with: { supervisor: true, student: true },
    });

    // Only emit supervisor email when task is COMPLETED
    if (updatedTask.status === "COMPLETED" && project?.supervisor?.email) {
      eventBus.emit(Events.TASK_SUBMITTED, {
        supervisorEmail: project.supervisor.email,
        supervisorName: project.supervisor.fullName,
        studentName: (req as any).user.fullName,
        projectName: project.title,
        taskTitle: task.title,
        taskStatus: updatedTask.status,
      });

      eventBus.emit(Events.TASK_SUBMITTED_CONFIRMATION, {
        studentEmail: (req as any).user.email,
        studentName: (req as any).user.fullName,
        projectName: project.title,
        taskTitle: task.title,
      });
    }

    res.status(200).json({
      message: "Task updated successfully",
      task: updatedTask,
    });
  } catch (error) {
    console.error("New Error", error);
    res.status(500).json({
      message: "Failed to update task",
      error,
    });
  }
};

export const verifyTaskBySupervisor = async (req: Request, res: Response) => {
  const { taskId } = req.params;
  const supervisorId = Number((req as any).user.userId);

  try {
    const task = await db.transaction(async (tx) => {
      const t = await tx.query.reviewTasks.findFirst({
        where: eq(reviewTasks.id, Number(taskId)),
      });
      if (!t) throw new Error("Task not found");
      if (t.status !== "COMPLETED")
        throw new Error("Task must be completed before verification");

      // Verify task
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

      // Check if all tasks in project are verified
      const allTasks = await tx.query.reviewTasks.findMany({
        where: eq(reviewTasks.projectId, t.projectId),
      });
      const allVerified = allTasks.every((task) => task.status === "VERIFIED");

      // Update project status
      await tx
        .update(projects)
        .set({ status: allVerified ? "APPROVED" : "REVISION_REQUESTED" })
        .where(eq(projects.id, t.projectId));

      return updatedTask;
    });

    // Emit email event for student
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

    res.status(200).json({ message: "Task verified successfully", task });
  } catch (err) {
    console.error(err);
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ message: "Failed to verify task", error: message });
  }
};

export const deleteTask = async (req: Request, res: Response) => {
  const { taskId } = req.params;

  try {
    // 1. Check if task exists
    const existingTask = await db.query.reviewTasks.findFirst({
      where: eq(reviewTasks.id, Number(taskId)),
    });

    if (!existingTask) {
      return res.status(404).json({ message: "Task not found" });
    }

    // 2. Perform deletion
    await db.delete(reviewTasks).where(eq(reviewTasks.id, Number(taskId)));

    return res.status(200).json({ message: "Task deleted successfully" });
  } catch (error) {
    console.error("Error deleting task:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const deleteReview = async (req: Request, res: Response) => {
  const { reviewId } = req.params;

  try {
    // 1. Check if review exists
    const existingReview = await db.query.reviews.findFirst({
      where: eq(reviews.id, Number(reviewId)),
    });

    if (!existingReview) {
      return res.status(404).json({ message: "Review round not found" });
    }

    // 2. Transaction to ensure both Review and its Tasks are removed safely
    await db.transaction(async (tx) => {
      // Delete all tasks linked to this review first
      await tx
        .delete(reviewTasks)
        .where(eq(reviewTasks.reviewId, Number(reviewId)));

      // Delete the review record itself
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
