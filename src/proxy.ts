import { NextResponse, type NextRequest } from 'next/server';

function skip(pathname: string) {
  return (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/login') ||
    pathname.includes('.')
  );
}

/** First path segment, e.g. `/main/about` → `main`. Empty for `/`. */
function firstPathSegment(pathname: string): string | null {
  const segments = pathname.split('/').filter(Boolean);
  return segments.length ? segments[0] : null;
}

function continueRequest(request: NextRequest, headers: Headers) {
  headers.set('x-pathname', request.nextUrl.pathname);
  return NextResponse.next({ request: { headers } });
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

  const siteSlug = firstPathSegment(pathname);
  if (siteSlug) headers.set('x-cms-site-slug', siteSlug);

  try {
    const lookup = new URL('/api/internal/redirect', request.url);
    lookup.searchParams.set('path', pathname);
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
    if (!response.ok) return continueRequest(request, headers);
    const data = (await response.json()) as { to?: string | null; status?: number };
    if (!data.to) return continueRequest(request, headers);
    return NextResponse.redirect(new URL(data.to, request.url), data.status ?? 301);
  } catch {
    return continueRequest(request, headers);
  }
}

export const config = {
  matcher: ['/((?!_next|api|dashboard|login|.*\\..*).*)'],
};
