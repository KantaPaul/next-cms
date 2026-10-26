// export function parseSearchParams(searchParams) {
//   const params = {};
//   searchParams.forEach((value, key) => {
//     params[key] = value;
//   });
//   return params;
// }

import type { AnyColumn, SQLWrapper } from 'drizzle-orm';
import { gte, lte } from 'drizzle-orm';
import isEmpty from 'lodash/isEmpty';
import type { ValueOf } from 'type-fest';
import { z } from 'zod';
import { ARRAY_SEPARATOR, RANGE_SEPARATOR } from '@/config/constant';
import { SortOrder } from '@/config/sorting';
import { isArraySafe } from '@/lib/utils/bool-check';
import { getDateRange, toFilterDateUTC } from '@/lib/utils/format-date';

export interface SearchParamsInput {
  search?: string;
  order?: ValueOf<typeof SortOrder>;
  sort?: string;
  pagination?: string;
  page?: string;
  size?: string;
  [key: string]: string | undefined;
}
export interface SearchParams {
  search?: string | null;
  order?: ValueOf<typeof SortOrder>;
  sort?: string;
  doPagination?: boolean;
  deletedAt?: boolean;
  page?: string;
  size?: string | number | null | undefined;

  [key: string]: string | string[] | boolean | number | Date | undefined | null;
}

export interface RangeParams {
  start: string;
  end: string;
}

export interface FindOneParams {
  id: string;
  teamId: string;
  userId?: string;
}
export interface FindOneParamsWithoutTeam {
  id: string;
  userId?: string;
}

export interface ContextSearchParams extends SearchParams {
  teamId: string;
  userId: string;
}

export type MutationSchemaInput<T> = T & {
  userId: string;
};

export interface Context {
  user: {
    id?: any;
    userId: string;
    teamId: string;
  };
  [key: string]: unknown; // Use unknown instead of any
}

export interface TableWithCreatedAt {
  createdAt: AnyColumn;
}

export function parseSearchParams<T extends SearchParams>(params: T): T {
  if (isEmpty(params)) return params;

  const parsedParams = Object.fromEntries(
    Object.entries(params).map(([key, value]) => {
      if (typeof value === 'string') {
        if (key.endsWith('[]')) {
          return [key.slice(0, -2), value?.split(',')];
        }

        if (value?.includes(RANGE_SEPARATOR)) {
          const range = parseRange(value);
          if (!range) return [key, undefined];
          return [key, range];
        }

        if (value?.includes(ARRAY_SEPARATOR)) {
          const arrayValue = value.split(ARRAY_SEPARATOR);
          if (!isArraySafe(arrayValue)) return [key, undefined];
          return [key, arrayValue];
        }

        if (value === 'all') return [key, undefined];

        return [key, value?.toString()?.trim()];
      }

      return [key, value];
    })
  );

  // Set default values for optional fields
  return {
    deletedAt: false,
    doPagination: true,
    ...parsedParams,
  } as T;
}

export function parseRange(value: string): RangeParams {
  const [start, end] = value?.split(RANGE_SEPARATOR) ?? [];
  return { start, end };
}

export function isRangeParams(value: unknown): value is RangeParams {
  if (!value || typeof value !== 'object') return false;

  const candidate = value as Record<string, string>;

  // Check if it has either start or end property
  if (!('start' in candidate) && !('end' in candidate)) return false;

  return true;
}

// Extend this schema with additional filters as needed
export const baseSearchParamsSchema = z.object({
  search: z.string().optional(),
  order: z.enum(SortOrder).optional(),
  sort: z.string().optional(),
  pagination: z.boolean().optional(),
  page: z.string().optional(),
  size: z.string().optional(),
});

export type TBaseSearchParams = z.infer<typeof baseSearchParamsSchema>;

/**
 * Creates search params with default values
 */
export function createSearchParams(
  params: Partial<SearchParams> = {}
): SearchParams {
  return {
    deletedAt: false,
    doPagination: true,
    ...params,
  };
}

/**
 * Creates date range conditions for a given table and search parameters.
 */
export function createDateRangeConditions<T extends TableWithCreatedAt>(
  table: T,
  searchParams: { dateRange: string }
): SQLWrapper[] {
  const conditions: SQLWrapper[] = [];
  const { startDate, endDate } = getDateRange(searchParams?.dateRange);

  if (startDate && endDate) {
    const prepareFormDate = toFilterDateUTC(new Date(startDate));
    const prepareToDate = toFilterDateUTC(new Date(endDate));

    if (!isNaN(prepareFormDate.getTime()) && !isNaN(prepareToDate.getTime())) {
      conditions.push(
        gte(table.createdAt, prepareFormDate),
        lte(table.createdAt, prepareToDate)
      );
    } else {
      console.warn('Invalid date format for startDate or endDate:', {
        startDate,
        endDate,
      });
    }
  } else {
    console.warn('Missing startDate or endDate:', { startDate, endDate });
  }

  return conditions;
}
