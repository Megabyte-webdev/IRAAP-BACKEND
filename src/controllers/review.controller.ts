import type { Request, Response } from "express";
import { projects, reviews } from "../database/schema.js";
import { and, eq } from "drizzle-orm";
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
