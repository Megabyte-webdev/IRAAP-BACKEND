import { sql } from "drizzle-orm";

export const withPagination = async <T>({
  dataQuery,
  countQuery,
  page,
  limit,
}: {
  dataQuery: (limit: number, offset: number) => Promise<T[]>;
  countQuery: Promise<any>;
  page: number;
  limit: number;
}) => {
  const safePage = Math.max(page, 1);
  const safeLimit = Math.min(Math.max(limit, 1), 100);

  const offset = (safePage - 1) * safeLimit;

  const [data, countResult] = await Promise.all([
    dataQuery(safeLimit, offset),
    countQuery,
  ]);

  const total = Number(countResult[0]?.count || 0);

  return {
    data,
    pagination: {
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit),
      hasMore: safePage < Math.ceil(total / safeLimit),
    },
  };
};
