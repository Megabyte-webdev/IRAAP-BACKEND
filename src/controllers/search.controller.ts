import type { Request, Response } from "express";
import { db } from "../config/db.js";
import { categories, metadata, projects, users } from "../database/schema.js";
import { and, desc, eq, ilike, sql, inArray, asc } from "drizzle-orm";

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

export const searchProjects = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const {
      title,
      keyword,
      supervisor,
      year,
      status = "APPROVED",
      limit = 20,
      offset = 0,
      sortBy = "Most Recent",
    } = req.query;

    // Helper to safely normalize query params into arrays of clean strings/numbers
    const parseArrayParam = (param: any): string[] => {
      if (!param) return [];
      if (Array.isArray(param)) return param.map(String).filter(Boolean);
      return String(param)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    };

    const keywords = parseArrayParam(keyword);
    const supervisors = parseArrayParam(supervisor);
    const years = parseArrayParam(year)
      .map(Number)
      .filter((n) => !isNaN(n));

    const limitNum = Math.min(Number(limit) || 20, 100);
    const offsetNum = Number(offset) || 0;

    // Build WHERE conditions
    const whereConditions = [];

    // 1. Always apply status filter if provided
    if (status) {
      whereConditions.push(eq(projects.status, status as any));
    }

    // 2. Title ILIKE Search
    if (title && String(title).trim() !== "") {
      whereConditions.push(ilike(projects.title, `%${String(title).trim()}%`));
    }

    // 3. Submission Years (IN array)
    if (years.length > 0) {
      whereConditions.push(inArray(projects.submissionYear, years));
    }

    // 4. Supervisors Match (FullName IN array)
    if (supervisors.length > 0) {
      whereConditions.push(inArray(users.fullName, supervisors));
    }

    // 5. Keywords/Research Area Flexible Match
    // Matches if keyword exists in EITHER researchArea OR keywords field (handling comma separated or partial string matches)
    if (keywords.length > 0) {
      const keywordConditions = keywords.flatMap((kw) => [
        ilike(metadata.researchArea, `%${kw}%`),
        ilike(metadata.keywords, `%${kw}%`),
      ]);
      whereConditions.push(sql`(${sql.join(keywordConditions, sql` OR `)})`);
    }

    const whereClause =
      whereConditions.length > 0 ? and(...whereConditions) : undefined;

    // Determine sort order
    let orderBy: any;
    switch (sortBy) {
      case "Oldest First":
        orderBy = asc(projects.createdAt);
        break;
      case "Alphabetical":
        orderBy = asc(projects.title);
        break;
      case "Most Recent":
      default:
        orderBy = desc(projects.createdAt);
    }

    // Get total count for pagination with applied filters
    const [{ count }] = await db
      .select({ count: sql<number>`count(DISTINCT ${projects.id})` })
      .from(projects)
      .leftJoin(categories, eq(projects.categoryId, categories.id))
      .leftJoin(metadata, eq(projects.id, metadata.projectId))
      .leftJoin(users, eq(projects.supervisorId, users.id))
      .where(whereClause);

    // Get paginated results
    const results = await db
      .select({
        id: projects.id,
        title: projects.title,
        abstract: projects.abstract,
        submissionYear: projects.submissionYear,
        status: projects.status,
        categoryId: projects.categoryId,
        category: categories.name,
        researchArea: metadata.researchArea,
        methodology: metadata.methodology,
        supervisor: users.fullName,
        supervisorId: users.id,
        createdAt: projects.createdAt,
        updatedAt: projects.updatedAt,
      })
      .from(projects)
      .leftJoin(categories, eq(projects.categoryId, categories.id))
      .leftJoin(metadata, eq(projects.id, metadata.projectId))
      .leftJoin(users, eq(projects.supervisorId, users.id))
      .where(whereClause)
      .orderBy(orderBy)
      .limit(limitNum)
      .offset(offsetNum);

    // Dynamic Facets based on filtered subset
    const keywordFacets = await db
      .select({
        name: metadata.researchArea,
        count: sql<number>`count(${projects.id})`,
      })
      .from(projects)
      .leftJoin(metadata, eq(projects.id, metadata.projectId))
      .where(eq(projects.status, "APPROVED"))
      .groupBy(metadata.researchArea);

    const yearFacets = await db
      .select({
        year: projects.submissionYear,
        count: sql<number>`count(${projects.id})`,
      })
      .from(projects)
      .where(eq(projects.status, "APPROVED"))
      .groupBy(projects.submissionYear)
      .orderBy(desc(projects.submissionYear));

    const supervisorFacets = await db
      .select({
        name: users.fullName,
        id: users.id,
        count: sql<number>`count(${projects.id})`,
      })
      .from(projects)
      .leftJoin(users, eq(projects.supervisorId, users.id))
      .where(eq(projects.status, "APPROVED"))
      .groupBy(users.id, users.fullName);

    const statusFacets = await db
      .select({
        status: projects.status,
        count: sql<number>`count(${projects.id})`,
      })
      .from(projects)
      .groupBy(projects.status);

    const response: SearchResponse = {
      data: results,
      metadata: {
        total: Number(count),
        limit: limitNum,
        offset: offsetNum,
        hasNextPage: offsetNum + limitNum < Number(count),
        facets: {
          keywords: keywordFacets.filter((f) => f.name !== null),
          years: yearFacets.filter((f) => f.year !== null),
          supervisors: supervisorFacets.filter((f) => f.name !== null),
          statuses: statusFacets,
        },
      },
    };

    res.status(200).json(response);
  } catch (error) {
    console.error("Search error:", error);
    res.status(500).json({
      message: "Search failed",
      error: error instanceof Error ? error.message : "Unknown error",
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
      .innerJoin(projects, eq(metadata.projectId, projects.id));

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
