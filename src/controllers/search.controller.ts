import type { Request, Response } from "express";
import { db } from "../config/db.js";
import { categories, metadata, projects, users } from "../database/schema.js";
import { aliasedTable, and, desc, eq, ilike, sql, inArray, asc, or } from "drizzle-orm";

type SortOption = "Most Recent" | "Oldest First" | "Alphabetical";

interface SearchParams {
  title?: string;
  keyword?: string[];
  supervisor?: string[];
  year?: number[];
  status?: string;
  limit?: number;
  offset?: number;
  sortBy?: SortOption;
}

interface SearchResponse {
  data: any[];
  metadata: {
    total: number;
    limit: number;
    offset: number;
    hasNextPage: boolean;
    facets: {
      keywords: Array<{ name: string; count: number }>;
      years: Array<{ year: number; count: number }>;
      supervisors: Array<{ name: string; id: number; count: number }>;
      statuses: Array<{ status: string; count: number }>;
    };
  };
}

export const searchProjects = async (req: Request, res: Response): Promise<void> => {
  try {
    const parseArrayParam = (param: unknown): string[] => {
      if (Array.isArray(param)) return param.map(String).map((v) => v.trim()).filter(Boolean);
      if (typeof param === "string") return param.split(",").map((v) => v.trim()).filter(Boolean);
      return [];
    };

    const title = String(req.query.title || "").trim();
    const keywords = parseArrayParam(req.query.keyword);
    const supervisors = parseArrayParam(req.query.supervisor);
    const years = parseArrayParam(req.query.year).map(Number).filter(Number.isInteger);
    const status = String(req.query.status || "APPROVED");
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
    const offset = Math.max(Number(req.query.offset) || 0, 0);
    const sortBy = String(req.query.sortBy || "Most Recent");

    const supervisorUser = aliasedTable(users, "search_supervisor");
    const conditions: any[] = [eq(projects.status, status as any)];
    if (years.length) conditions.push(inArray(projects.submissionYear, years));
    if (supervisors.length) conditions.push(inArray(supervisorUser.fullName, supervisors));

    if (title) {
      const terms = title.split(/\s+/).filter(Boolean).slice(0, 8);
      conditions.push(or(
        ilike(projects.title, `%${title}%`),
        ilike(projects.abstract, `%${title}%`),
        ilike(metadata.researchArea, `%${title}%`),
        ilike(metadata.methodology, `%${title}%`),
        ...terms.map((term) => sql`${metadata.keywords}::text ILIKE ${`%${term}%`}`),
      ));
    }

    if (keywords.length) {
      conditions.push(or(...keywords.map((keyword) => or(
        sql`${metadata.keywords}::text ILIKE ${`%${keyword}%`}`,
        ilike(metadata.researchArea, `%${keyword}%`),
        ilike(projects.title, `%${keyword}%`),
        ilike(projects.abstract, `%${keyword}%`),
      ))));
    }

    const whereClause = and(...conditions);
    const orderBy = sortBy === "Oldest First"
      ? asc(projects.createdAt)
      : sortBy === "Alphabetical"
        ? asc(projects.title)
        : desc(projects.updatedAt);

    const [{ count }] = await db
      .select({ count: sql<number>`count(DISTINCT ${projects.id})` })
      .from(projects)
      .leftJoin(metadata, eq(projects.id, metadata.projectId))
      .leftJoin(users, eq(projects.studentId, users.id))
      .leftJoin(supervisorUser, eq(projects.supervisorId, supervisorUser.id))
      .where(whereClause);

    const results = await db
      .select({
        id: projects.id,
        title: projects.title,
        abstract: projects.abstract,
        fileUrl: projects.fileUrl,
        publicId: projects.publicId,
        submissionYear: projects.submissionYear,
        status: projects.status,
        categoryId: projects.categoryId,
        category: categories.name,
        keywords: metadata.keywords,
        researchArea: metadata.researchArea,
        methodology: metadata.methodology,
        researchType: projects.researchType,
        supervisor: supervisorUser.fullName,
        supervisorId: supervisorUser.id,
        author: users.fullName,
        createdAt: projects.createdAt,
        updatedAt: projects.updatedAt,
      })
      .from(projects)
      .leftJoin(categories, eq(projects.categoryId, categories.id))
      .leftJoin(metadata, eq(projects.id, metadata.projectId))
      .leftJoin(users, eq(projects.studentId, users.id))
      .leftJoin(supervisorUser, eq(projects.supervisorId, supervisorUser.id))
      .where(whereClause)
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset);

    const total = Number(count || 0);
    res.status(200).json({
      success: true,
      data: results,
      projects: results,
      metadata: {
        total,
        limit,
        offset,
        hasNextPage: offset + limit < total,
      },
    });
  } catch (error) {
    console.error("Search error:", error);
    res.status(500).json({
      success: false,
      message: "Search failed",
    });
  }
};
// Get all available filter options (for initial load)
export const getFilterOptions = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const rawMetadata = await db
      .select({
        researchArea: metadata.researchArea,
        keywords: metadata.keywords,
      })
      .from(metadata)
      .innerJoin(projects, eq(metadata.projectId, projects.id))
      .where(eq(projects.status, "APPROVED"));

    const researchAreasSet = new Set<string>();
    const keywordsSet = new Set<string>();

    const processField = (
      value: string | string[] | null | undefined,
      targetSet: Set<string>,
    ) => {
      if (!value) return;
      const items = Array.isArray(value) ? value : value.split(",");
      items
        .map((item) => item.trim())
        .filter((item) => item.length > 0)
        .forEach((item) => targetSet.add(item));
    };

    for (const item of rawMetadata) {
      processField(item.researchArea, researchAreasSet);
      processField(item.keywords, keywordsSet);
    }

    const sortedResearchAreas = Array.from(researchAreasSet).sort((a, b) =>
      a.localeCompare(b),
    );

    const sortedKeywords = Array.from(keywordsSet).sort((a, b) =>
      a.localeCompare(b),
    );

    const years = await db
      .selectDistinct({ year: projects.submissionYear })
      .from(projects)
      .orderBy(desc(projects.submissionYear));

    const supervisors = await db
      .selectDistinct({
        id: users.id,
        name: users.fullName,
      })
      .from(users)
      .innerJoin(projects, eq(users.id, projects.supervisorId))
      .where(eq(projects.status, "APPROVED"))
      .orderBy(asc(users.fullName));

    res.status(200).json({
      researchAreas: sortedResearchAreas,
      keywords: sortedKeywords,
      years: years.map((y) => y.year),
      supervisors: supervisors.map((s) => ({
        id: s.id,
        name: s.name,
      })),
    });
  } catch (error) {
    console.error("Filter options error:", error);
    res.status(500).json({
      message: "Failed to fetch filter options",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
// Enhanced homepage with better featured projects
export const getHomepageData = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const [projectsCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(projects)
      .where(eq(projects.status, "APPROVED"));

    const [researchersCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(eq(users.role, "STUDENT"));

    const [supervisorsCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(eq(users.role, "SUPERVISOR"));

    // Featured Projects (latest approved with metadata)
    const featuredProjects = await db
      .select({
        id: projects.id,
        title: projects.title,
        abstract: projects.abstract,
        category: categories.name,
        categoryId: projects.categoryId,
        researchArea: metadata.researchArea,
        submissionYear: projects.submissionYear,
        supervisor: users.fullName,
        createdAt: projects.createdAt,
      })
      .from(projects)
      .leftJoin(categories, eq(projects.categoryId, categories.id))
      .leftJoin(metadata, eq(projects.id, metadata.projectId))
      .leftJoin(users, eq(projects.supervisorId, users.id))
      .where(eq(projects.status, "APPROVED"))
      .orderBy(desc(projects.createdAt))
      .limit(6);

    // Trending keywords
    const trendingKeywords = await db
      .select({
        keyword: metadata.researchArea,
        count: sql<number>`count(${projects.id})`,
      })
      .from(metadata)
      .innerJoin(projects, eq(metadata.projectId, projects.id))
      .where(eq(projects.status, "APPROVED"))
      .groupBy(metadata.researchArea)
      .orderBy(desc(sql`count(${projects.id})`))
      .limit(8);

    res.status(200).json({
      stats: {
        projects: Number(projectsCount.count),
        researchers: Number(researchersCount.count),
        supervisors: Number(supervisorsCount.count),
      },
      featuredProjects,
      trendingKeywords: trendingKeywords
        .filter((k) => k.keyword !== null)
        .map((k) => ({
          name: k.keyword,
          count: Number(k.count),
        })),
    });
  } catch (error) {
    console.error("Homepage data error:", error);
    res.status(500).json({
      message: "Failed to fetch homepage data",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const getCategories = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const categoriesList = await db.select().from(categories);
    res.status(200).json({
      message: "Categories fetched successfully",
      categories: categoriesList,
    });
  } catch (error) {
    console.error("Categories error:", error);
    res.status(500).json({
      message: "Failed to fetch categories",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
