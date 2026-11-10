import type { Request, Response } from "express";
import { and, eq, sql } from "drizzle-orm";
import { db } from "../config/db.js";
import {
  projects,
  publicationRequests,
  reviews,
  users,
} from "../database/schema.js";
import { errorResponse } from "../utils/helper.js";
import jwt from "jsonwebtoken";

export const getAdvancedAnalytics = async (_req: Request, res: Response) => {
  try {
    const [
      usersByRole,
      projectsByStatus,
      publicationsByStatus,
      reviewsByStatus,
    ] = await Promise.all([
      db
        .select({ role: users.role, count: sql<number>`count(*)::int` })
        .from(users)
        .groupBy(users.role),
      db
        .select({ status: projects.status, count: sql<number>`count(*)::int` })
        .from(projects)
        .groupBy(projects.status),
      db
        .select({
          status: publicationRequests.status,
          count: sql<number>`count(*)::int`,
        })
        .from(publicationRequests)
        .groupBy(publicationRequests.status),
      db
        .select({
          status: reviews.revisionSubmitted,
          count: sql<number>`count(*)::int`,
        })
        .from(reviews)
        .groupBy(reviews.revisionSubmitted),
    ]);

    const [monthlyProjects, monthlyPublications] = await Promise.all([
      db
        .select({
          month: sql<string>`to_char(date_trunc('month', ${projects.createdAt}), 'YYYY-MM')`,
          count: sql<number>`count(*)::int`,
        })
        .from(projects)
        .groupBy(sql`date_trunc('month', ${projects.createdAt})`)
        .orderBy(sql`date_trunc('month', ${projects.createdAt})`)
        .limit(12),
      db
        .select({
          month: sql<string>`to_char(date_trunc('month', ${publicationRequests.createdAt}), 'YYYY-MM')`,
          count: sql<number>`count(*)::int`,
        })
        .from(publicationRequests)
        .groupBy(sql`date_trunc('month', ${publicationRequests.createdAt})`)
        .orderBy(sql`date_trunc('month', ${publicationRequests.createdAt})`)
        .limit(12),
    ]);

    return res.json({
      analytics: {
        usersByRole,
        projectsByStatus,
        publicationsByStatus,
        reviews: reviewsByStatus,
        trends: {
          projects: monthlyProjects,
          publications: monthlyPublications,
        },
      },
    });
  } catch (error) {
    console.error("getAdvancedAnalytics error", error);
    return errorResponse(res, 500, "Failed to fetch analytics");
  }
};

export const createToken = async (req: Request, res: Response) => {
  const { room_code, name, user_id } = req.query;

  if (
    typeof room_code !== "string" ||
    typeof name !== "string" ||
    typeof user_id !== "string" ||
    !room_code.trim() ||
    !name.trim() ||
    !user_id.trim()
  ) {
    return res.status(400).json({
      error: "Missing or invalid required parameters: room_code, name, user_id",
    });
  }

  try {
    const { DEFCOMM_APP_ID, DEFCOMM_API_SECRET, DEFCOMM_API_KEY } = process.env;

    if (!DEFCOMM_APP_ID || !DEFCOMM_API_SECRET || !DEFCOMM_API_KEY) {
      throw new Error("Missing Defcomm token configuration");
    }

    const token = jwt.sign(
      {
        application_id: DEFCOMM_APP_ID,
        room_code: room_code.trim(),
        meeting_capabilities: [
          "allow_audio",
          "allow_video",
          "allow_screen",
          "subscribe",
        ],
        permissions: [],
        name: name.trim(),
      },
      DEFCOMM_API_SECRET,
      {
        algorithm: "HS256",
        keyid: DEFCOMM_API_KEY,
        issuer: "defcomm",
        audience: "defcomm-sfu",
        subject: user_id.trim(),
        expiresIn: "5m",
      },
    );

    return res.status(200).json({
      success: true,
      token,
      expires_in: 300,
    });
  } catch (error) {
    console.error("createToken error:", error);

    return res.status(500).json({
      error: "Failed to create token",
    });
  }
};
