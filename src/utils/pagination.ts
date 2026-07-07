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
  const offset = (page - 1) * limit;

  const [data, countResult] = await Promise.all([
    dataQuery(limit, offset),
    countQuery,
  ]);

  const total = Number(countResult[0]?.count || 0);

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
