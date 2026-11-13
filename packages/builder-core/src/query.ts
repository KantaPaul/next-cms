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
  'external-api',
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
    'hasImage',
    'booleanToggle',
    'minNumber',
    'maxNumber',
  ],
  pages: [
    'categories',
    'tags',
    'authorId',
    'search',
    'publishedAfter',
    'publishedBefore',
    'isHome',
    'hasImage',
    'minNumber',
    'maxNumber',
  ],
  'collection-entries': [
    'collectionId',
    'terms',
    'categories',
    'tags',
    'search',
    'publishedAfter',
    'publishedBefore',
    'hasImage',
    'booleanToggle',
    'minNumber',
    'maxNumber',
  ],
  videos: [
    'playlistId',
    'provider',
    'search',
    'publishedAfter',
    'publishedBefore',
    'duration',
    'hasImage',
    'minNumber',
    'maxNumber',
  ],
  'external-api': [
    'search',
    'publishedAfter',
    'publishedBefore',
    'hasImage',
    'minNumber',
    'maxNumber',
  ],
} as const;

export const EXT_FILTER_PREFIX = 'ext:';
export const EXT_PARAM_PREFIX = 'ext_';
export const EXT_KEY_PATTERN = /^[a-zA-Z0-9_.-]{1,120}$/;

/** Extracts the raw field key from an `ext:<key>` filter field, or null. */
export function externalApiFilterKey(field: string): string | null {
  if (!field.startsWith(EXT_FILTER_PREFIX)) return null;
  const key = field.slice(EXT_FILTER_PREFIX.length);
  return EXT_KEY_PATTERN.test(key) ? key : null;
}

export interface ExternalApiFilterFieldConfig {
  key: string;
  label?: string;
  /** How the filter input looks; see EXT_FILTER_STYLES in the app. */
  style?: 'select' | 'checkboxes' | 'radio' | 'chips' | 'search' | 'range' | 'toggle';
}

/** Allowlisted sortable fields per source. */
export const ALLOWED_SORT_FIELDS: Record<ListingSource, readonly string[]> = {
  posts: ['publishedAt', 'title', 'createdAt', 'updatedAt'],
  pages: ['publishedAt', 'title', 'createdAt', 'updatedAt'],
  'collection-entries': ['publishedAt', 'createdAt', 'updatedAt'],
  videos: ['publishedAt', 'title', 'position', 'duration', 'createdAt'],
  'external-api': ['publishedAt', 'title'],
} as const;

export const externalApiFieldMapSchema = z.object({
  id: z.string().min(1).default('id'),
  title: z.string().min(1).default('title'),
  slug: z.string().optional(),
  url: z.string().optional(),
  excerpt: z.string().optional(),
  image: z.string().optional(),
  publishedAt: z.string().optional(),
});

export type ExternalApiFieldMap = z.infer<typeof externalApiFieldMapSchema>;

export const externalApiConfigSchema = z.object({
  endpointUrl: z.string().url(),
  method: z.enum(['GET', 'POST']).default('GET'),
  headers: z.record(z.string(), z.string()).default({}),
  queryParams: z.record(z.string(), z.string()).optional(),
  dataFilters: z
    .array(
      z.object({
        key: z.string(),
        operator: z.enum([
          'equals',
          'not_equals',
          'contains',
          'not_contains',
          'starts_with',
          'gt',
          'lt',
          'in',
          'not_empty',
        ]),
        value: z.string().optional(),
      })
    )
    .optional(),
  body: z.string().optional(),
  itemsPath: z.string().default(''),
  totalPath: z.string().optional(),
  facetKeys: z.array(z.string()).optional(),
  fieldMap: externalApiFieldMapSchema.default({ id: 'id', title: 'title' }),
  cacheTtlSeconds: z.number().int().min(0).max(3600).default(60),
  timeoutMs: z.number().int().min(500).max(10000).default(4000),
});

export type ExternalApiConfig = z.infer<typeof externalApiConfigSchema>;

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

/** Custom-field key on a collection entry (`data->>key`). */
export const FIELD_KEY_PATTERN = /^[a-zA-Z0-9_]{1,100}$/;

/** Prefix that marks a sort on a collection entry's custom field (`field:price`). */
export const FIELD_SORT_PREFIX = 'field:';

export const FIELD_FILTER_OPERATORS = [
  'eq',
  'neq',
  'contains',
  'gt',
  'gte',
  'lt',
  'lte',
  'in',
  'exists',
] as const;

export type FieldFilterOperator = (typeof FIELD_FILTER_OPERATORS)[number];

/**
 * Filter on a collection entry's custom field. Keys are checked again on the
 * server against the collection's real fields before any SQL is built.
 */
export const fieldFilterSchema = z.object({
  key: z.string().regex(FIELD_KEY_PATTERN),
  operator: z.enum(FIELD_FILTER_OPERATORS),
  value: z
    .union([z.string(), z.number(), z.boolean(), z.array(z.string())])
    .optional(),
});

export type FieldFilter = z.infer<typeof fieldFilterSchema>;

/** Custom field key from a `field:<key>` sort, or null. */
export function fieldSortKey(sortField: string): string | null {
  if (!sortField.startsWith(FIELD_SORT_PREFIX)) return null;
  const key = sortField.slice(FIELD_SORT_PREFIX.length);
  return FIELD_KEY_PATTERN.test(key) ? key : null;
}

/** Validates and clamps a listing query configuration against allowlists. */
export const listingQuerySchema = z
  .object({
    source: z.enum(LISTING_SOURCES),
    collectionId: z.string().optional(),
    apiConfig: externalApiConfigSchema.optional(),
    filters: z.array(queryFilterSchema).default([]),
    /** Custom-field filters; collection-entries only. */
    fieldFilters: z.array(fieldFilterSchema).max(20).default([]),
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

    // 1b. Validate external-api requires apiConfig
    if (val.source === 'external-api' && !val.apiConfig?.endpointUrl) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['apiConfig'],
        message: 'apiConfig with endpointUrl is required when source is external-api',
      });
    }

    // 2. Validate sortField is allowlisted for the source
    const allowedSorts = ALLOWED_SORT_FIELDS[val.source] ?? [];
    const isFieldSort =
      val.source === 'collection-entries' && fieldSortKey(val.sortField) !== null;
    if (!isFieldSort && !allowedSorts.includes(val.sortField)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['sortField'],
        message: `Sort field '${val.sortField}' is not allowed for source '${val.source}'. Allowed: ${allowedSorts.join(', ')}`,
      });
    }

    if (val.fieldFilters.length > 0 && val.source !== 'collection-entries') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['fieldFilters'],
        message: 'fieldFilters are only supported for collection-entries',
      });
    }

    // 3. Validate each filter field is allowlisted for the source
    const allowedFilters = ALLOWED_FILTER_FIELDS[val.source] ?? [];
    val.filters.forEach((filter, idx) => {
      const isExtField =
        val.source === 'external-api' &&
        externalApiFilterKey(filter.field) !== null;
      if (!isExtField && !allowedFilters.includes(filter.field)) {
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
  hasGallery?: boolean;
  galleryCount?: number;
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
    taxonomy: string;
  }[];
  source: ListingSource;
  raw?: Record<string, unknown>;
}

export interface FacetOption {
  value: string;
  label: string;
  count: number;
}

export interface ListingFacets {
  categories?: FacetOption[];
  tags?: FacetOption[];
  authors?: FacetOption[];
  providers?: FacetOption[];
  hasImage?: FacetOption[];
  ext?: Record<string, FacetOption[]>;
}

export interface ListingQueryResult {
  items: NormalizedListingItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasMore: boolean;
  facets?: ListingFacets;
  error?: string;
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
  categories?: string[];
  tag?: string;
  tags?: string[];
  term?: string;
  terms?: string[];
  author?: string;
  from?: string;
  to?: string;
  min?: number;
  max?: number;
  toggle?: boolean;
  sort?: string;
  order?: 'asc' | 'desc';
  ext?: Record<string, string[]>;
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

  const getMultiParam = (key: string): string[] => {
    const namespacedKey = formatNamespacedParam(key, namespace);
    if (rawParams instanceof URLSearchParams) {
      return rawParams
        .getAll(namespacedKey)
        .flatMap(v => v.split(','))
        .map(v => v.trim())
        .filter(Boolean);
    }
    const val = rawParams[namespacedKey];
    if (!val) return [];
    const arr = Array.isArray(val) ? val : [val];
    return arr
      .flatMap(v => v.split(','))
      .map(v => v.trim())
      .filter(Boolean);
  };

  const rawPage = getParam('page');
  const pageNum = rawPage ? parseInt(rawPage, 10) : undefined;
  const page = pageNum && !Number.isNaN(pageNum) && pageNum > 0 ? pageNum : undefined;

  const search = getParam('q') || getParam('search');
  const categoriesList = getMultiParam('category');
  const category = categoriesList[0];
  const tagsList = getMultiParam('tag');
  const tag = tagsList[0];
  const termsList = getMultiParam('terms').length
    ? getMultiParam('terms')
    : getMultiParam('term');
  const term = termsList[0];
  const author = getParam('author');
  const from = getParam('from');
  const to = getParam('to');

  const rawMin = getParam('min');
  const minNum = rawMin !== undefined && rawMin !== '' ? Number(rawMin) : undefined;
  const min = minNum !== undefined && !Number.isNaN(minNum) ? minNum : undefined;

  const rawMax = getParam('max');
  const maxNum = rawMax !== undefined && rawMax !== '' ? Number(rawMax) : undefined;
  const max = maxNum !== undefined && !Number.isNaN(maxNum) ? maxNum : undefined;

  const rawToggle = getParam('toggle')?.toLowerCase();
  const toggle =
    rawToggle === '1' || rawToggle === 'true'
      ? true
      : rawToggle === '0' || rawToggle === 'false'
        ? false
        : undefined;

  const sort = getParam('sort');
  const rawOrder = getParam('order')?.toLowerCase();
  const order = rawOrder === 'asc' || rawOrder === 'desc' ? rawOrder : undefined;

  const extPrefix = formatNamespacedParam(EXT_PARAM_PREFIX, namespace);
  const ext: Record<string, string[]> = {};
  const rawKeys =
    rawParams instanceof URLSearchParams
      ? Array.from(new Set(rawParams.keys()))
      : Object.keys(rawParams);
  for (const fullKey of rawKeys) {
    if (!fullKey.startsWith(extPrefix)) continue;
    const fieldKey = fullKey.slice(extPrefix.length);
    if (!EXT_KEY_PATTERN.test(fieldKey)) continue;
    const values = getMultiParam(`${EXT_PARAM_PREFIX}${fieldKey}`);
    if (values.length > 0) {
      ext[fieldKey] = values;
    }
  }

  return {
    ...(page !== undefined && { page }),
    ...(search && { search: search.trim() }),
    ...(category && { category }),
    ...(categoriesList.length > 1 && { categories: categoriesList }),
    ...(tag && { tag }),
    ...(tagsList.length > 1 && { tags: tagsList }),
    ...(term && { term }),
    ...(termsList.length > 1 && { terms: termsList }),
    ...(author && { author: author.trim() }),
    ...(from && { from: from.trim() }),
    ...(to && { to: to.trim() }),
    ...(min !== undefined && { min }),
    ...(max !== undefined && { max }),
    ...(toggle !== undefined && { toggle }),
    ...(sort && { sort: sort.trim() }),
    ...(order && { order }),
    ...(Object.keys(ext).length > 0 && { ext }),
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
  if (params.categories && params.categories.length > 0) {
    encoded[formatNamespacedParam('category', namespace)] =
      params.categories.join(',');
  } else if (params.category) {
    encoded[formatNamespacedParam('category', namespace)] = params.category;
  }
  if (params.tags && params.tags.length > 0) {
    encoded[formatNamespacedParam('tag', namespace)] = params.tags.join(',');
  } else if (params.tag) {
    encoded[formatNamespacedParam('tag', namespace)] = params.tag;
  }
  if (params.author) {
    encoded[formatNamespacedParam('author', namespace)] = params.author;
  }
  if (params.from) {
    encoded[formatNamespacedParam('from', namespace)] = params.from;
  }
  if (params.to) {
    encoded[formatNamespacedParam('to', namespace)] = params.to;
  }
  if (params.min !== undefined) {
    encoded[formatNamespacedParam('min', namespace)] = String(params.min);
  }
  if (params.max !== undefined) {
    encoded[formatNamespacedParam('max', namespace)] = String(params.max);
  }
  if (params.toggle !== undefined) {
    encoded[formatNamespacedParam('toggle', namespace)] = params.toggle
      ? '1'
      : '0';
  }
  if (params.sort) {
    encoded[formatNamespacedParam('sort', namespace)] = params.sort;
  }
  if (params.order) {
    encoded[formatNamespacedParam('order', namespace)] = params.order;
  }
  if (params.ext) {
    for (const [fieldKey, values] of Object.entries(params.ext)) {
      if (!EXT_KEY_PATTERN.test(fieldKey) || !Array.isArray(values)) continue;
      const cleaned = values.map(v => v.trim()).filter(Boolean);
      if (cleaned.length > 0) {
        encoded[formatNamespacedParam(`${EXT_PARAM_PREFIX}${fieldKey}`, namespace)] =
          cleaned.join(',');
      }
    }
  }
  return encoded;
}
