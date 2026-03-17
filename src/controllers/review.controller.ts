import type { Request, Response } from "express";
import { projects, reviews } from "../database/schema.js";
import { and, eq } from "drizzle-orm";
import { db } from "../config/db.js";

export const generateReview = async (req: Request, res: Response) => {
  const { supervisorId, comments, rating, projectId } = req.body;
  try {
    // 1. Verify that the project exists and belongs to the supervisor
    const project = await db.query.projects.findFirst({
      where: and(
        eq(projects.id, projectId),
        eq(projects.supervisorId, supervisorId),
      ),
    });

    if (!project) {
      return res
        .status(404)
        .json({ message: "Project not found or access denied" });
    }
    const review = {
      projectId: project.id,
      reviewerId: supervisorId,
      comments,
      rating,
    };
    await db.insert(reviews).values(review);

    res.status(201).json({ message: "Review submitted successfully" });
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
