import { createHash, timingSafeEqual } from 'node:crypto';
import type { SiteModeSettings, SiteModeValue } from './site-essentials-types';

export const SITE_MODE_BYPASS_COOKIE = 'cms_site_mode_bypass';
export const SITE_MODE_BYPASS_QUERY = 'bypass';
export const SITE_MODE_PATH = '/_site-mode';

/** Paths never blocked by maintenance / coming-soon mode. */
export function isAlwaysAllowedSiteModePath(pathname: string): boolean {
  return (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/media') ||
    pathname === '/robots.txt' ||
    pathname === '/sitemap.xml' ||
    pathname === SITE_MODE_PATH ||
    isStaticFilePath(pathname)
  );
}

/**
 * Real static files only. Any dot used to count, so slugs like
 * `/blog/release-1.2` stayed public during maintenance.
 */
const STATIC_FILE =
  /\.(?:ico|png|jpe?g|gif|webp|avif|svg|css|js|mjs|map|json|txt|xml|webmanifest|woff2?|ttf|otf|eot|mp4|webm|mp3|pdf)$/i;

export function isStaticFilePath(pathname: string): boolean {
  return STATIC_FILE.test(pathname);
}

/** Matches `pathname` (with optional site prefix stripped) against `excludePaths`. */
export function isPathExcludedFromSiteMode(
  pathname: string,
  excludePaths: string[] | undefined,
  siteSlug?: string | null
): boolean {
  if (!excludePaths?.length) return false;
  const stripped =
    siteSlug && pathname.startsWith(`/${siteSlug}/`)
      ? pathname.slice(siteSlug.length + 1)
      : siteSlug && pathname === `/${siteSlug}`
        ? '/'
        : pathname;

  for (const raw of excludePaths) {
    const pattern = raw.trim();
    if (!pattern) continue;
    const normalized = pattern.startsWith('/') ? pattern : `/${pattern}`;
    if (normalized.endsWith('*')) {
      const prefix = normalized.slice(0, -1);
      if (stripped.startsWith(prefix) || pathname.startsWith(prefix)) {
        return true;
      }
    } else if (
      stripped === normalized ||
      stripped.startsWith(`${normalized}/`) ||
      pathname === normalized ||
      pathname.startsWith(`${normalized}/`)
    ) {
      return true;
    }
  }
  return false;
}

export function hashBypassToken(token: string): string {
  return createHash('sha256').update(`site-mode:${token}`).digest('hex');
}

function safeEqualHex(a: string, b: string): boolean {
  if (!a || !b || a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a, 'utf8'), Buffer.from(b, 'utf8'));
  } catch {
    return false;
  }
}

export type SiteModeEvaluation = {
  mode: SiteModeValue;
  blocked: boolean;
  status: 200 | 503;
  retryAfter?: string;
  noindex: boolean;
  setBypassCookieHash?: string;
};

export function evaluateSiteModeAccess(input: {
  siteMode?: SiteModeSettings | null;
  pathname: string;
  siteSlug?: string | null;
  bypassParam?: string | null;
  bypassCookie?: string | null;
  hasStaffSession: boolean;
}): SiteModeEvaluation {
  const mode: SiteModeValue = input.siteMode?.mode ?? 'live';
  if (mode === 'live') {
    return { mode: 'live', blocked: false, status: 200, noindex: false };
  }

  if (
    isAlwaysAllowedSiteModePath(input.pathname) ||
    isPathExcludedFromSiteMode(
      input.pathname,
      input.siteMode?.excludePaths,
      input.siteSlug
    )
  ) {
    return { mode, blocked: false, status: 200, noindex: false };
  }

  if (input.hasStaffSession) {
    return { mode, blocked: false, status: 200, noindex: false };
  }

  const expectedToken = input.siteMode?.bypassToken?.trim();
  if (expectedToken) {
    const expectedHash = hashBypassToken(expectedToken);
    if (input.bypassParam) {
      const paramHash = hashBypassToken(input.bypassParam.trim());
      if (safeEqualHex(paramHash, expectedHash)) {
        return {
          mode,
          blocked: false,
          status: 200,
          noindex: false,
          setBypassCookieHash: expectedHash,
        };
      }
    }
    if (input.bypassCookie) {
      if (safeEqualHex(input.bypassCookie.trim(), expectedHash)) {
        return { mode, blocked: false, status: 200, noindex: false };
      }
    }
  }

  if (mode === 'maintenance') {
    return {
      mode: 'maintenance',
      blocked: true,
      status: 503,
      retryAfter: '3600',
      noindex: true,
    };
  }

  return {
    mode: 'coming_soon',
    blocked: true,
    status: 200,
    noindex: true,
  };
}
