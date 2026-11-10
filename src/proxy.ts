import { NextResponse, type NextRequest } from 'next/server';
import { ADMIN_BAR_HINT_COOKIE } from '@/lib/admin-bar';
import { RESERVED_SITE_SLUGS } from '@/lib/utils/site-slug';

function skip(pathname: string) {
  return (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/login') ||
    pathname.includes('.')
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

function continueRequest(request: NextRequest, headers: Headers, rewrite: string | null) {
  headers.set('x-pathname', request.nextUrl.pathname);
  if (rewrite) {
    const url = request.nextUrl.clone();
    url.pathname = rewrite;
    return syncSignedInHint(request, NextResponse.rewrite(url, { request: { headers } }));
  }
  return syncSignedInHint(
    request,
    NextResponse.next({ request: { headers } })
  );
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (skip(pathname)) return NextResponse.next();

  // Never trust client-sent site selection headers. The proxy is the only
  // place allowed to set x-cms-site-slug (from the first path segment) and
  // x-cms-host (from the real request host).
  const headers = new Headers(request.headers);
  headers.delete('x-cms-host');
  headers.delete('x-cms-site-slug');
  headers.set('x-cms-host', request.headers.get('host') ?? '');

  const siteSlug = siteSlugFromPath(pathname);
  if (siteSlug) headers.set('x-cms-site-slug', siteSlug);
  const rewrite = rewriteTarget(pathname, siteSlug);

  try {
    const pParam = request.nextUrl.searchParams.get('p');
    const pageIdParam = request.nextUrl.searchParams.get('page_id');
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
        ...(cookie ? { cookie } : {}),
      },
    });
    if (!response.ok) return continueRequest(request, headers, rewrite);
    const data = (await response.json()) as { to?: string | null; status?: number };
    if (!data.to) return continueRequest(request, headers, rewrite);
    return syncSignedInHint(
      request,
      NextResponse.redirect(new URL(data.to, request.url), data.status ?? 301)
    );
  } catch {
    return continueRequest(request, headers, rewrite);
  }
}

export const config = {
  matcher: ['/((?!_next|api|dashboard|login|.*\\..*).*)'],
};
