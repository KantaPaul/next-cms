import 'server-only';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { env } from '@/env.mjs';
import { apiKeysService } from '@/server/services/api-keys.service';
import { siteSettingsService } from '@/server/services/site-settings.service';

const RATE_LIMIT = 60;
const WINDOW_MS = 60_000;

// Per-process fixed window. Good enough for a single instance; use a shared store when running several.
const windows = new Map<string, { start: number; count: number }>();

function rateLimit(keyId: string) {
  const now = Date.now();
  let entry = windows.get(keyId);

  if (!entry || now - entry.start >= WINDOW_MS) {
    entry = { start: now, count: 0 };
    windows.set(keyId, entry);
  }

  entry.count += 1;
  return {
    allowed: entry.count <= RATE_LIMIT,
    remaining: Math.max(0, RATE_LIMIT - entry.count),
    reset: Math.ceil((entry.start + WINDOW_MS) / 1000),
  };
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
};

export class ApiRequestError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
  }
}

/** Reads an optional query param that must be one of `allowed`. */
export function enumParam<T extends string>(
  url: URL,
  name: string,
  allowed: readonly T[]
): T | undefined {
  const value = url.searchParams.get(name);
  if (!value) return undefined;
  if (!allowed.includes(value as T))
    throw new ApiRequestError(
      400,
      `"${name}" must be one of: ${allowed.join(', ')}.`
    );
  return value as T;
}

export function apiError(
  status: number,
  message: string,
  headers?: Record<string, string>
) {
  return NextResponse.json(
    { error: { status, message } },
    { status, headers: { ...CORS_HEADERS, ...headers } }
  );
}

function readKey(request: Request) {
  const auth = request.headers.get('authorization');
  if (auth?.toLowerCase().startsWith('bearer ')) return auth.slice(7).trim();
  return request.headers.get('x-api-key')?.trim() || null;
}

export type ApiContext<P> = { params: P; url: URL; siteUrl: string };

/** Wraps a read-only v1 handler with API key auth, rate limiting, and CORS. */
export function apiHandler<P = Record<string, never>>(
  handler: (request: Request, ctx: ApiContext<P>) => Promise<unknown>
) {
  return async (request: Request, route: { params: Promise<P> }) => {
    const key = readKey(request);
    if (!key)
      return apiError(
        401,
        'Missing API key. Send it as "Authorization: Bearer <key>".'
      );

    const apiKey = await apiKeysService.verify(key);
    if (!apiKey) return apiError(401, 'Invalid or revoked API key.');

    const limit = rateLimit(apiKey.id);
    const limitHeaders = {
      'X-RateLimit-Limit': String(RATE_LIMIT),
      'X-RateLimit-Remaining': String(limit.remaining),
      'X-RateLimit-Reset': String(limit.reset),
    };

    if (!limit.allowed) {
      return apiError(
        429,
        'Rate limit exceeded. Try again after the reset time.',
        {
          ...limitHeaders,
          'Retry-After': String(
            Math.max(1, limit.reset - Math.floor(Date.now() / 1000))
          ),
        }
      );
    }

    try {
      const settings = await siteSettingsService.get();
      const siteUrl = (settings.siteUrl || env.SITE_URL).replace(/\/$/, '');
      const body = await handler(request, {
        params: await route.params,
        url: new URL(request.url),
        siteUrl,
      });
      if (body === null) return apiError(404, 'Not found.', limitHeaders);
      return NextResponse.json(body, {
        headers: {
          ...CORS_HEADERS,
          ...limitHeaders,
          'Cache-Control': 'no-store',
        },
      });
    } catch (error) {
      if (error instanceof ApiRequestError)
        return apiError(error.status, error.message, limitHeaders);
      console.error('[api/v1]', error);
      return apiError(500, 'Something went wrong.', limitHeaders);
    }
  };
}

export function apiOptions() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

/** Reads `page` and `limit` query params with sane bounds. */
export function pagination(url: URL, defaultLimit = 20) {
  const limit = Math.min(
    100,
    Math.max(1, Number(url.searchParams.get('limit')) || defaultLimit)
  );
  const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
  return { limit, page, offset: (page - 1) * limit };
}

export const absoluteUrl = (siteUrl: string, path: string) =>
  /^https?:\/\//.test(path) ? path : `${siteUrl}${path}`;

const metaSchema = z.object({
  page: z.number(),
  limit: z.number(),
  total: z.number(),
  totalPages: z.number(),
});

export const pageListItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  slug: z.string(),
  language: z.string(),
  isHome: z.boolean(),
  editorType: z.string(),
  translationGroupId: z.string().nullable(),
  publishedAt: z.string().nullable(),
  updatedAt: z.string().nullable(),
  seoTitle: z.string().nullable(),
  seoDescription: z.string().nullable(),
  url: z.string(),
});

export const pagesListResponseSchema = z.object({
  data: z.array(pageListItemSchema),
  meta: metaSchema,
});

export const seoSchema = z
  .object({
    title: z.string().nullable(),
    description: z.string().nullable(),
    keywords: z.string().nullable(),
    canonicalUrl: z.string().nullable(),
    noIndex: z.boolean(),
    ogTitle: z.string().nullable(),
    ogDescription: z.string().nullable(),
    ogImage: z.string().nullable(),
    ogType: z.string().nullable(),
    twitterCard: z.string().nullable(),
    structuredDataType: z.string().nullable(),
  })
  .nullable();

export const pageDetailResponseSchema = z.object({
  data: pageListItemSchema
    .omit({ seoTitle: true, seoDescription: true })
    .extend({
      content: z.unknown(),
      seo: seoSchema,
      alternates: z.array(
        z.object({ language: z.string(), slug: z.string(), url: z.string() })
      ),
    }),
});

export const postListItemSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    slug: z.string(),
    language: z.string(),
    url: z.string(),
  })
  .loose();

export const postsListResponseSchema = z.object({
  data: z.array(postListItemSchema),
  meta: metaSchema,
});

export const postDetailResponseSchema = z.object({
  data: postListItemSchema.extend({
    body: z.string(),
    layoutType: z.string(),
    layout: z.unknown(),
    blogUrl: z.string().nullable(),
    seo: seoSchema,
  }),
});

export const menuItemSchema = z.object({
  id: z.string(),
  label: z.string(),
  url: z.string(),
  target: z.string(),
  badge: z.string().nullable(),
  order: z.number(),
});

export const menusResponseSchema = z.object({
  data: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      location: z.string(),
      items: z.array(menuItemSchema.extend({ children: z.array(menuItemSchema) })),
    })
  ),
});

export const mediaItemSchema = z.object({
  id: z.string(),
  url: z.string(),
  filename: z.string(),
  title: z.string().nullable(),
  alt: z.string().nullable(),
  mime: z.string(),
  size: z.number(),
  width: z.number().nullable(),
  height: z.number().nullable(),
});

export const mediaListResponseSchema = z.object({
  data: z.array(mediaItemSchema),
  meta: metaSchema,
});

export const settingsResponseSchema = z.object({
  data: z.object({
    siteName: z.string(),
    siteDescription: z.string().nullable(),
    siteUrl: z.string(),
    logo: z.string().nullable(),
    favicon: z.string().nullable(),
    defaultOgImage: z.string().nullable(),
    headerMenuId: z.string().nullable(),
    footerMenuId: z.string().nullable(),
    themeTokens: z.unknown(),
    updatedAt: z.string().nullable(),
  }),
});

export const searchHitSchema = z.object({
  kind: z.enum(['page', 'post']),
  title: z.string(),
  path: z.string(),
  language: z.string(),
  snippet: z.string(),
  url: z.string(),
});

export const searchResponseSchema = z.object({
  data: z.array(searchHitSchema),
  meta: z.object({ q: z.string(), lang: z.string().nullable() }),
});

export const apiSchemas = {
  PagesList: pagesListResponseSchema,
  Page: pageDetailResponseSchema,
  PostsList: postsListResponseSchema,
  Post: postDetailResponseSchema,
  Menus: menusResponseSchema,
  MediaList: mediaListResponseSchema,
  Settings: settingsResponseSchema,
  Search: searchResponseSchema,
};

