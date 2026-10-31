/**
 * Typed listing query schema, allowlists, and namespacing (R571, R573 / QRY-01, QRY-03).
 */

import { z } from 'zod';

export const MAX_PAGE_SIZE = 100;
export const DEFAULT_PAGE_SIZE = 10;

export const LISTING_SOURCES = [
  'posts',
  'pages',
  'collection-entries',
  'videos',
] as const;

export type ListingSource = (typeof LISTING_SOURCES)[number];

/** Allowlisted filterable fields per source to prevent arbitrary database column querying. */
export const ALLOWED_FILTER_FIELDS: Record<ListingSource, readonly string[]> = {
  posts: [
    'categories',
    'tags',
    'authorId',
    'search',
    'publishedAfter',
    'publishedBefore',
  ],
  pages: [
    'categories',
    'tags',
    'authorId',
    'search',
    'publishedAfter',
    'publishedBefore',
  ],
  'collection-entries': [
    'collectionId',
    'search',
    'publishedAfter',
    'publishedBefore',
  ],
  videos: [
    'playlistId',
    'provider',
    'search',
    'publishedAfter',
    'publishedBefore',
  ],
} as const;

/** Allowlisted sortable fields per source. */
export const ALLOWED_SORT_FIELDS: Record<ListingSource, readonly string[]> = {
  posts: ['publishedAt', 'title', 'createdAt', 'updatedAt'],
  pages: ['publishedAt', 'title', 'createdAt', 'updatedAt'],
  'collection-entries': ['publishedAt', 'createdAt', 'updatedAt'],
  videos: ['publishedAt', 'title', 'position', 'duration', 'createdAt'],
} as const;

export type QueryFilterOperator =
  | 'eq'
  | 'in'
  | 'contains'
  | 'gte'
  | 'lte'
  | 'between';

export const queryFilterSchema = z.object({
  field: z.string().min(1),
  operator: z.enum(['eq', 'in', 'contains', 'gte', 'lte', 'between']),
  value: z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.array(z.string()),
    z.array(z.number()),
  ]),
});

export type QueryFilter = z.infer<typeof queryFilterSchema>;

/** Validates and clamps a listing query configuration against allowlists. */
export const listingQuerySchema = z
  .object({
    source: z.enum(LISTING_SOURCES),
    collectionId: z.string().optional(),
    filters: z.array(queryFilterSchema).default([]),
    sortField: z.string().default('publishedAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
    limit: z
      .number()
      .int()
      .min(1)
      .max(MAX_PAGE_SIZE)
      .default(DEFAULT_PAGE_SIZE),
    offset: z.number().int().min(0).default(0),
    page: z.number().int().min(1).default(1),
    excludeCurrent: z.boolean().default(false),
    currentId: z.string().optional(),
  })
  .superRefine((val, ctx) => {
    // 1. Validate collection-entries requires collectionId
    if (val.source === 'collection-entries' && !val.collectionId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['collectionId'],
        message: 'collectionId is required when source is collection-entries',
      });
    }

    // 2. Validate sortField is allowlisted for the source
    const allowedSorts = ALLOWED_SORT_FIELDS[val.source] ?? [];
    if (!allowedSorts.includes(val.sortField)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['sortField'],
        message: `Sort field '${val.sortField}' is not allowed for source '${val.source}'. Allowed: ${allowedSorts.join(', ')}`,
      });
    }

    // 3. Validate each filter field is allowlisted for the source
    const allowedFilters = ALLOWED_FILTER_FIELDS[val.source] ?? [];
    val.filters.forEach((filter, idx) => {
      if (!allowedFilters.includes(filter.field)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['filters', idx, 'field'],
          message: `Filter field '${filter.field}' is not allowed for source '${val.source}'. Allowed: ${allowedFilters.join(', ')}`,
        });
      }
    });
  });

export type ListingQueryConfig = z.infer<typeof listingQuerySchema>;

/** Unified normalized representation of an item returned from any listing query. */
export interface NormalizedListingItem {
  id: string;
  title: string;
  slug: string;
  url: string;
  excerpt?: string | null;
  image?: string | null;
  publishedAt?: string | null;
  author?: {
    id: string;
    name: string;
    image?: string | null;
  } | null;
  terms?: {
    id: string;
    name: string;
    slug: string;
    taxonomy: 'category' | 'tag';
  }[];
  source: ListingSource;
  raw?: Record<string, unknown>;
}

export interface ListingQueryResult {
  items: NormalizedListingItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasMore: boolean;
}

// ---------------------------------------------------------------------------
// Namespaced URL query parameters (R573 / QRY-03)
// ---------------------------------------------------------------------------

/** Formats a parameter name with an optional namespace prefix (e.g. "feat_page" or "page"). */
export function formatNamespacedParam(key: string, namespace?: string | null): string {
  const cleanNamespace = namespace?.trim().replace(/[^a-zA-Z0-9_-]/g, '');
  return cleanNamespace ? `${cleanNamespace}_${key}` : key;
}

export interface ParsedListingParams {
  page?: number;
  search?: string;
  category?: string;
  tag?: string;
  sort?: string;
  order?: 'asc' | 'desc';
}

/** Parses query params from URLSearchParams or record with an optional namespace prefix. */
export function parseNamespacedParams(
  rawParams: URLSearchParams | Record<string, string | string[] | undefined>,
  namespace?: string | null
): ParsedListingParams {
  const getParam = (key: string): string | undefined => {
    const namespacedKey = formatNamespacedParam(key, namespace);
    if (rawParams instanceof URLSearchParams) {
      return rawParams.get(namespacedKey) ?? undefined;
    }
    const val = rawParams[namespacedKey];
    if (Array.isArray(val)) return val[0];
    return val;
  };

  const rawPage = getParam('page');
  const pageNum = rawPage ? parseInt(rawPage, 10) : undefined;
  const page = pageNum && !Number.isNaN(pageNum) && pageNum > 0 ? pageNum : undefined;

  const search = getParam('q') || getParam('search');
  const category = getParam('category');
  const tag = getParam('tag');
  const sort = getParam('sort');
  const rawOrder = getParam('order')?.toLowerCase();
  const order = rawOrder === 'asc' || rawOrder === 'desc' ? rawOrder : undefined;

  return {
    ...(page !== undefined && { page }),
    ...(search && { search: search.trim() }),
    ...(category && { category: category.trim() }),
    ...(tag && { tag: tag.trim() }),
    ...(sort && { sort: sort.trim() }),
    ...(order && { order }),
  };
}

/** Encodes params into an object with namespace prefixes applied. */
export function encodeNamespacedParams(
  params: ParsedListingParams,
  namespace?: string | null
): Record<string, string> {
  const encoded: Record<string, string> = {};
  if (params.page !== undefined && params.page > 1) {
    encoded[formatNamespacedParam('page', namespace)] = String(params.page);
  }
  if (params.search) {
    encoded[formatNamespacedParam('q', namespace)] = params.search;
  }
  if (params.category) {
    encoded[formatNamespacedParam('category', namespace)] = params.category;
  }
  if (params.tag) {
    encoded[formatNamespacedParam('tag', namespace)] = params.tag;
  }
  if (params.sort) {
    encoded[formatNamespacedParam('sort', namespace)] = params.sort;
  }
  if (params.order) {
    encoded[formatNamespacedParam('order', namespace)] = params.order;
  }
  return encoded;
}
