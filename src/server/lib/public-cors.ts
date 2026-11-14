import { NextResponse } from 'next/server';

export interface CorsSiteConfig {
  id: string;
  primaryHost?: string | null;
  extraDomains?: string[] | null;
  exportAllowedOrigins?: string[] | null;
}

export function normalizeOrigin(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    if (trimmed.includes('://')) {
      const url = new URL(trimmed);
      return `${url.protocol}//${url.host}`.toLowerCase();
    }
    return `https://${trimmed}`.toLowerCase();
  } catch {
    return null;
  }
}

export function buildAllowedOrigins(site: CorsSiteConfig): Set<string> {
  const allowed = new Set<string>();
  const addHost = (host: string | null | undefined) => {
    if (!host) return;
    const trimmed = host.trim();
    if (!trimmed) return;
    if (trimmed.includes('://')) {
      const orig = normalizeOrigin(trimmed);
      if (orig) allowed.add(orig);
    } else {
      allowed.add(`https://${trimmed.toLowerCase()}`);
      allowed.add(`http://${trimmed.toLowerCase()}`);
    }
  };

  addHost(site.primaryHost);
  for (const d of site.extraDomains ?? []) addHost(d);
  for (const o of site.exportAllowedOrigins ?? []) addHost(o);
  return allowed;
}

export function isSameOriginRequest(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return true;
  const host = request.headers.get('host');
  if (!host) return false;
  try {
    const originHost = new URL(origin).host.toLowerCase();
    return originHost === host.toLowerCase();
  } catch {
    return false;
  }
}

export function evaluatePublicCors(
  request: Request,
  site: CorsSiteConfig
): { allowed: boolean; allowOriginHeader: string | null; reason?: string } {
  const origin = request.headers.get('origin');
  if (!origin) {
    return { allowed: true, allowOriginHeader: null };
  }

  if (isSameOriginRequest(request)) {
    return { allowed: true, allowOriginHeader: origin };
  }

  const headerSiteId = request.headers.get('x-cms-site')?.trim();
  if (headerSiteId && headerSiteId !== site.id) {
    return {
      allowed: false,
      allowOriginHeader: null,
      reason: 'x-cms-site does not match target site',
    };
  }

  const normalizedOrigin = normalizeOrigin(origin);
  const allowed = buildAllowedOrigins(site);
  if (!normalizedOrigin || !allowed.has(normalizedOrigin)) {
    return {
      allowed: false,
      allowOriginHeader: null,
      reason: 'Origin is not in exportAllowedOrigins',
    };
  }

  return { allowed: true, allowOriginHeader: origin };
}

export function corsHeaders(allowOrigin: string | null): Record<string, string> {
  if (!allowOrigin) return {};
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-cms-site',
    Vary: 'Origin',
  };
}

export function publicCorsPreflight(
  request: Request,
  site: CorsSiteConfig
): NextResponse {
  const result = evaluatePublicCors(request, site);
  if (!result.allowed) {
    return NextResponse.json(
      { error: result.reason ?? 'Origin not allowed' },
      { status: 403 }
    );
  }
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(result.allowOriginHeader),
  });
}
