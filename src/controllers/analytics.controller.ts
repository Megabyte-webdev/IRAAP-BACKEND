import type { Request, Response } from "express";
import { and, eq, sql } from "drizzle-orm";
import { db } from "../config/db.js";
import { projects, publicationRequests, reviews, users } from "../database/schema.js";
import { errorResponse } from "../utils/helper.js";

export const getAdvancedAnalytics = async (_req: Request, res: Response) => {
  try {
    const [usersByRole, projectsByStatus, publicationsByStatus, reviewsByStatus] = await Promise.all([
      db.select({ role: users.role, count: sql<number>`count(*)::int` }).from(users).groupBy(users.role),
      db.select({ status: projects.status, count: sql<number>`count(*)::int` }).from(projects).groupBy(projects.status),
      db.select({ status: publicationRequests.status, count: sql<number>`count(*)::int` }).from(publicationRequests).groupBy(publicationRequests.status),
      db.select({ status: reviews.revisionSubmitted, count: sql<number>`count(*)::int` }).from(reviews).groupBy(reviews.revisionSubmitted),
    ]);

    const [monthlyProjects, monthlyPublications] = await Promise.all([
      db.select({ month: sql<string>`to_char(date_trunc('month', ${projects.createdAt}), 'YYYY-MM')`, count: sql<number>`count(*)::int` }).from(projects).groupBy(sql`date_trunc('month', ${projects.createdAt})`).orderBy(sql`date_trunc('month', ${projects.createdAt})`).limit(12),
      db.select({ month: sql<string>`to_char(date_trunc('month', ${publicationRequests.createdAt}), 'YYYY-MM')`, count: sql<number>`count(*)::int` }).from(publicationRequests).groupBy(sql`date_trunc('month', ${publicationRequests.createdAt})`).orderBy(sql`date_trunc('month', ${publicationRequests.createdAt})`).limit(12),
    ]);

    return res.json({
      analytics: {
        usersByRole,
        projectsByStatus,
        publicationsByStatus,
        reviews: reviewsByStatus,
        trends: { projects: monthlyProjects, publications: monthlyPublications },
      },
    });
  } catch (error) {
    console.error("getAdvancedAnalytics error", error);
    return errorResponse(res, 500, "Failed to fetch analytics");
  }
};
