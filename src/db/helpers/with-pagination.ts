// import type { PgSelect } from "drizzle-orm/pg-core";

import { DEFAULT_PAGE_SIZE } from '@/config/constant';

// export function withPagination<T extends PgSelect>(
//   qb: T,
//   page = 1,
//   pageSize = 10,
// ) {
//   return qb.limit(pageSize).offset((page - 1) * pageSize);
// }

// const query = db.select().from(users).where(eq(users.id, 1));
// const dynamicQuery = query.$dynamic();
// withPagination(dynamicQuery, 1);

type PaginateParams = {
  page: string;
  size: string | number | null | undefined;
};

export const paginate = (
  { page, size }: Partial<PaginateParams>,
  def = { page: '1', size: DEFAULT_PAGE_SIZE } as const
) => {
  const requestedPage = Math.max(0, Number(page ?? def.page) - 1);
  const requestedLimit = Math.max(1, Number(size ?? def.size));
  const offset = requestedPage * requestedLimit;
  return {
    offset,
    limit: requestedLimit,
  };
};

export function getPageSizeParams(
  queryParams: { page?: string | number; size?: string | number } | undefined,
  savedParams?: { page?: string | number; size?: string | number } | undefined,
  defaultPage = 1,
  defaultSize = 10
): { page: number; size: number } {
  const parseParam = (
    value: string | number | undefined,
    defaultValue: number
  ): number => {
    if (value === undefined) return defaultValue;
    const parsed = Number(value);
    return !isNaN(parsed) && parsed > 0 ? parsed : defaultValue;
  };

  return {
    page: parseParam(queryParams?.page ?? savedParams?.page, defaultPage),
    size: parseParam(queryParams?.size ?? savedParams?.size, defaultSize),
  };
}
