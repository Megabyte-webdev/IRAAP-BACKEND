import { sql, Subquery } from "drizzle-orm";
import type { PgSelect } from "drizzle-orm/pg-core";

interface PaginationParams {
  page: number;
  limit: number;
}

export const withPagination = async <T extends PgSelect>({
  dataQuery,
  countQuery,
  page,
  limit,
}: {
  dataQuery: any;
  countQuery: any;
  page: number;
  limit: number;
}) => {
  const offset = (page - 1) * limit;

  // Fast count query
  const countResult = await countQuery;
  const total = Number(countResult[0]?.count || 0);

  // Paginated data query
  const data = await (dataQuery as any).limit(limit).offset(offset);

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
