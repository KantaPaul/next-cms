import 'server-only';
import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { env } from '@/env.mjs';
import { db } from '@/db';
import { apiRateWindows } from '@/db/schema';
import { apiKeysService } from '@/server/services/api-keys.service';
import { siteContext, siteBySlug } from '@/server/services/site-context';
import { siteSettingsService } from '@/server/services/site-settings.service';
import { licenseService } from '@/server/services/license.service';

const RATE_LIMIT = 60;
const WINDOW_MS = 60_000;

async function rateLimit(keyId: string) {
  const now = new Date();
  const windowStart = new Date(
    Math.floor(now.getTime() / WINDOW_MS) * WINDOW_MS
  );

  const [existing] = await db
    .select({ count: apiRateWindows.count })
    .from(apiRateWindows)
    .where(
      and(
        eq(apiRateWindows.apiKeyId, keyId),
        eq(apiRateWindows.windowStart, windowStart)
      )
    )
    .limit(1);

  let count: number;
  if (existing) {
    const [row] = await db
      .update(apiRateWindows)
      .set({ count: (existing.count as number) + 1 })
      .where(
        and(
          eq(apiRateWindows.apiKeyId, keyId),
          eq(apiRateWindows.windowStart, windowStart)
        )
      )
      .returning({ count: apiRateWindows.count });
    count = row.count as number;
  } else {
    const [row] = await db
      .insert(apiRateWindows)
      .values({ apiKeyId: keyId, windowStart, count: 1 })
      .returning({ count: apiRateWindows.count });
    count = row.count as number;
  }

  return {
    allowed: count <= RATE_LIMIT,
    remaining: Math.max(0, RATE_LIMIT - count),
    reset: Math.ceil((windowStart.getTime() + WINDOW_MS) / 1000),
  };
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
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

/** Wraps a v1 handler with API key auth, scope check, rate limiting, and CORS. */
export function apiHandler<P = Record<string, never>>(
  handler: (request: Request, ctx: ApiContext<P>) => Promise<unknown>,
  requiredScopes: string[] = []
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
    const siteSlug = new URL(request.url).searchParams.get('site')?.trim();
    const site = siteSlug
      ? await siteBySlug(siteSlug)
      : await siteContext.publicSite();
    if (!site) return apiError(404, 'Site not found.');
    if (apiKey.siteId !== site.id) {
      return apiError(401, 'Invalid or revoked API key.');
    }

    // Scope check
    const keyScopes = apiKey.scopes ?? [];
    if (
      requiredScopes.length &&
      !requiredScopes.some(s => keyScopes.includes(s))
    ) {
      return apiError(
        403,
        'API key missing required scope.',
        limitHeadersPlaceholder()
      );
    }

    // R241 / L5-04: Mutating /api/v1 handlers call requireLicense; published public GET stays up
    if (
      request.method !== 'GET' &&
      request.method !== 'HEAD' &&
      request.method !== 'OPTIONS'
    ) {
      const licenseCheck = await licenseService.requireLicense();
      if (!licenseCheck.ok) {
        return apiError(
          403,
          'License verification required to execute mutations.'
        );
      }
    }

    const limit = await rateLimit(apiKey.id);
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
      const settings = await siteSettingsService.getPublic();
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

function limitHeadersPlaceholder(): Record<string, string> {
  return {
    'X-RateLimit-Limit': String(RATE_LIMIT),
    'X-RateLimit-Remaining': String(RATE_LIMIT),
    'X-RateLimit-Reset': String(Math.ceil(Date.now() / 1000) + 60),
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
