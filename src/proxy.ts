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

function continueRequest(request: NextRequest) {
  const headers = new Headers(request.headers);
  headers.set('x-pathname', request.nextUrl.pathname);
  return NextResponse.next({ request: { headers } });
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (skip(pathname)) return NextResponse.next();

  try {
    const lookup = new URL('/api/internal/redirect', request.url);
    lookup.searchParams.set('path', pathname);
    const response = await fetch(lookup, {
      cache: 'no-store',
      headers: { 'x-cms-host': request.headers.get('host') ?? '' },
    });
    if (!response.ok) return continueRequest(request);
    const data = (await response.json()) as { to?: string | null; status?: number };
    if (!data.to) return continueRequest(request);
    return NextResponse.redirect(new URL(data.to, request.url), data.status ?? 301);
  } catch {
    return continueRequest(request);
  }
}

export const config = {
  matcher: ['/((?!_next|api|dashboard|login|.*\\..*).*)'],
};
