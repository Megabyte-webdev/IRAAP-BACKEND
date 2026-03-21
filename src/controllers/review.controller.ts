import type { Request, Response } from "express";
import { projects, reviews, reviewTasks } from "../database/schema.js";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "../config/db.js";

export const generateReview = async (req: Request, res: Response) => {
  const { supervisorId, comments, rating, projectId } = req.body;

  try {
    const result = await db.transaction(async (tx) => {
      // Verify the project exists and belongs to supervisor
      const project = await tx.query.projects.findFirst({
        where: and(
          eq(projects.id, projectId),
          eq(projects.supervisorId, supervisorId),
        ),
      });

      if (!project) {
        throw new Error("Project not found or access denied");
      }

      // Insert the review
      const review = {
        projectId: project.id,
        reviewerId: supervisorId,
        comments,
        rating,
      };
      await tx.insert(reviews).values(review);

      //  Update project status if provided
      let updatedProject = project;

      const updatedRows = await tx
        .update(projects)
        .set({ status: "REVISION_REQUESTED" })
        .where(eq(projects.id, projectId))
        .returning();
      updatedProject = updatedRows[0];

      return { review, project: updatedProject };
    });

    res.status(201).json({
      message: "Review submitted successfully",
      review: result.review,
      project: result.project,
    });
  } catch (error) {
    console.error("Error generating review:", error);
    res.status(500).json({ message: "Failed to submit review", error });
  }
};

export const getReviewsForProject = async (req: Request, res: Response) => {
  const { projectId } = req.params;
  try {
    const allReviews = await db.query.reviews.findMany({
      where: eq(reviews.projectId, Number(projectId)),
    });

    res
      .status(200)
      .json({ message: "Reviews fetched successfully", reviews: allReviews });
  } catch (error) {
    console.error("Error fetching reviews:", error);
    res.status(500).json({ message: "Failed to fetch reviews", error });
  }
};

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

      return review;
    });

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

    res.status(200).json({
      message: "Task updated successfully",
      task: updatedTask,
    });
  } catch (error) {
    console.error(error);
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

    res.status(200).json({ message: "Task verified successfully", task });
  } catch (err) {
    console.error(err);
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ message: "Failed to verify task", error: message });
  }
};
