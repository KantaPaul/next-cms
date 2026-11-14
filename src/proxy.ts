import { NextResponse, type NextRequest } from 'next/server';
import { ADMIN_BAR_HINT_COOKIE } from '@/lib/admin-bar';
import { dashboardLocale } from '@/lib/locale/admin-href';
import {
  SITE_MODE_BYPASS_COOKIE,
  SITE_MODE_BYPASS_QUERY,
  SITE_MODE_PATH,
  isStaticFilePath,
  type SiteModeEvaluation,
} from '@/lib/site-mode-gate';
import { RESERVED_SITE_SLUGS } from '@/lib/utils/site-slug';

function skip(pathname: string) {
  return (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/media') ||
    pathname === '/robots.txt' ||
    pathname === '/sitemap.xml' ||
    pathname === SITE_MODE_PATH ||
    isStaticFilePath(pathname)
  );
}

/**
 * Site slug from the first path segment, e.g. `/main/about` → `main`.
 * Null for `/` and for reserved routes such as `/search`, which are never sites.
 */
function siteSlugFromPath(pathname: string): string | null {
  const first = pathname.split('/').filter(Boolean)[0];
  return first && !RESERVED_SITE_SLUGS.has(first) ? first : null;
}

/** Top-level routes that also answer under a site prefix, e.g. `/main/search`. */
const GLOBAL_ROUTES = new Set(['/search', '/user-guide/print']);

function rewriteTarget(pathname: string, siteSlug: string | null): string | null {
  if (!siteSlug) return null;
  const rest = `/${pathname.split('/').filter(Boolean).slice(1).join('/')}`;
  return GLOBAL_ROUTES.has(rest) ? rest : null;
}

/** Mirrors whether a session cookie exists into a readable hint for the admin bar. */
function syncSignedInHint(request: NextRequest, response: NextResponse) {
  const hasSession = Boolean(request.cookies.get('session')?.value);
  const hasHint = request.cookies.has(ADMIN_BAR_HINT_COOKIE);

  if (hasSession && !hasHint) {
    response.cookies.set(ADMIN_BAR_HINT_COOKIE, '1', {
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });
  } else if (!hasSession && hasHint) {
    response.cookies.delete(ADMIN_BAR_HINT_COOKIE);
  }

  return response;
}

function withBypassCookie(
  response: NextResponse,
  siteMode?: SiteModeEvaluation
): NextResponse {
  if (siteMode?.setBypassCookieHash) {
    response.cookies.set(SITE_MODE_BYPASS_COOKIE, siteMode.setBypassCookieHash, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7,
    });
  }
  return response;
}

function continueRequest(
  request: NextRequest,
  headers: Headers,
  rewrite: string | null,
  siteMode?: SiteModeEvaluation
) {
  headers.set('x-pathname', request.nextUrl.pathname);
  if (rewrite) {
    const url = request.nextUrl.clone();
    url.pathname = rewrite;
    return withBypassCookie(
      syncSignedInHint(request, NextResponse.rewrite(url, { request: { headers } })),
      siteMode
    );
  }
  return withBypassCookie(
    syncSignedInHint(request, NextResponse.next({ request: { headers } })),
    siteMode
  );
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (skip(pathname)) return NextResponse.next();

  // Never trust client-sent site or locale selection headers.
  const headers = new Headers(request.headers);
  headers.delete('x-cms-host');
  headers.delete('x-cms-site-slug');
  headers.delete('x-cms-site-mode-bypass');
  headers.delete('x-cms-admin-locale');
  headers.set('x-cms-host', request.headers.get('host') ?? '');

  if (pathname === '/dashboard' || pathname.startsWith('/dashboard/')) {
    const { locale, rewritePath } = dashboardLocale(pathname);
    headers.set('x-pathname', rewritePath ?? pathname);
    if (locale && rewritePath) {
      headers.set('x-cms-admin-locale', locale);
      const url = request.nextUrl.clone();
      url.pathname = rewritePath;
      return NextResponse.rewrite(url, { request: { headers } });
    }
    return NextResponse.next({ request: { headers } });
  }

  const siteSlug = siteSlugFromPath(pathname);
  if (siteSlug) headers.set('x-cms-site-slug', siteSlug);
  const rewrite = rewriteTarget(pathname, siteSlug);

  try {
    const pParam = request.nextUrl.searchParams.get('p');
    const pageIdParam = request.nextUrl.searchParams.get('page_id');
    const bypassParam = request.nextUrl.searchParams.get(SITE_MODE_BYPASS_QUERY);
    const isRootOfSite =
      pathname === '/' || (siteSlug ? pathname === `/${siteSlug}` : false);
    const lookupPath =
      isRootOfSite && pParam
        ? `${siteSlug ? `/${siteSlug}` : ''}/?p=${pParam}`
        : isRootOfSite && pageIdParam
          ? `${siteSlug ? `/${siteSlug}` : ''}/?page_id=${pageIdParam}`
          : pathname;

    const lookup = new URL('/api/internal/redirect', request.url);
    lookup.searchParams.set('path', lookupPath);
    const cookie = request.headers.get('cookie');
    const response = await fetch(lookup, {
      cache: 'no-store',
      headers: {
        'x-cms-host': headers.get('x-cms-host') ?? '',
        ...(headers.get('x-cms-site-slug')
          ? { 'x-cms-site-slug': headers.get('x-cms-site-slug')! }
          : {}),
        ...(bypassParam ? { 'x-cms-site-mode-bypass': bypassParam } : {}),
        ...(cookie ? { cookie } : {}),
      },
    });
    if (!response.ok) return continueRequest(request, headers, rewrite);
    const data = (await response.json()) as {
      to?: string | null;
      status?: number;
      siteMode?: SiteModeEvaluation;
    };

    if (data.siteMode?.blocked) {
      headers.set('x-pathname', pathname);
      const url = request.nextUrl.clone();
      url.pathname = SITE_MODE_PATH;
      url.search = '';
      const responseHeaders = new Headers();
      if (data.siteMode.mode === 'maintenance') {
        responseHeaders.set('Retry-After', data.siteMode.retryAfter ?? '3600');
        return syncSignedInHint(
          request,
          NextResponse.rewrite(url, {
            status: 503,
            headers: responseHeaders,
            request: { headers },
          })
        );
      }
      responseHeaders.set('X-Robots-Tag', 'noindex, nofollow');
      return syncSignedInHint(
        request,
        NextResponse.rewrite(url, {
          status: 200,
          headers: responseHeaders,
          request: { headers },
        })
      );
    }

    if (!data.to) {
      return continueRequest(request, headers, rewrite, data.siteMode);
    }
    return withBypassCookie(
      syncSignedInHint(
        request,
        NextResponse.redirect(new URL(data.to, request.url), data.status ?? 301)
      ),
      data.siteMode
    );
  } catch {
    return continueRequest(request, headers, rewrite);
  }
}

export const config = {
  // Skip real static files only (keep in sync with isStaticFilePath). Skipping
  // every dotted path let slugs like /blog/release-1.2 bypass maintenance mode
  // and redirects. Must stay a literal: Next reads it at build time.
  matcher: [
    '/((?!_next|api|login|.*\\.(?:ico|png|jpe?g|gif|webp|avif|svg|css|js|mjs|map|json|txt|xml|webmanifest|woff2?|ttf|otf|eot|mp4|webm|mp3|pdf)$).*)',
  ],
};
