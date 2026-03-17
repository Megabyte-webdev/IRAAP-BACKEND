import { sql } from "drizzle-orm";
import type { PgSelect } from "drizzle-orm/pg-core";
import { db } from "../config/db.js";

interface PaginationParams {
  page: number;
  limit: number;
}

export const withPagination = async <T extends PgSelect>(
  qb: T,
  params: PaginationParams,
) => {
  const { page, limit } = params;
  const offset = (page - 1) * limit;

  const countResult = await db.execute(
    sql`SELECT count(*) FROM (${qb}) as count_subquery`,
  );

  const total = Number(countResult.rows[0]?.count || 0);

  const data = await (qb as any).limit(limit).offset(offset);

  return {
    data,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};
