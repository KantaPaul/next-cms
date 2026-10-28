import { z } from 'zod';

/** Routes that must never be usable as a site slug so path-mode URLs stay unambiguous. */
export const RESERVED_SITE_SLUGS = new Set([
  'dashboard',
  'api',
  'login',
  'blog',
  'search',
  'media',
  'sitemap.xml',
  'robots.txt',
  '_next',
]);

/** A site slug: lowercase letters, numbers and hyphens, 2-40 characters. */
const slugRegex = /^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/;

/**
 * Validates a site slug for use in path-based URLs.
 * - lowercase letters, numbers and hyphens only
 * - 2 to 40 characters
 * - must not start or end with a hyphen
 * - must not collide with a reserved route
 * - must not equal an enabled locale code
 */
export function validateSiteSlug(input: unknown, options: {
  enabledLocaleCodes?: string[];
} = {}): { ok: true; slug: string } | { ok: false; error: string } {
  const enabledLocaleCodes = options.enabledLocaleCodes ?? [];
  const parsed = z.string()
    .min(2, 'Slug must be at least 2 characters.')
    .max(40, 'Slug must be at most 40 characters.')
    .regex(slugRegex, 'Slug may only contain lowercase letters, numbers and hyphens, and cannot start or end with a hyphen.')
    .safeParse(input);

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map(i => i.message).join('; ') };
  }

  const slug = parsed.data;
  if (RESERVED_SITE_SLUGS.has(slug)) {
    return { ok: false, error: `“${slug}” is a reserved route and cannot be used as a site slug.` };
  }
  if (enabledLocaleCodes.includes(slug)) {
    return { ok: false, error: `“${slug}” is an enabled locale code and cannot be used as a site slug.` };
  }
  return { ok: true, slug };
}

/** Slugifies a site name into a URL-safe slug, falling back to "site" when empty. */
export function slugifySiteName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'site';
}

export type SiteRoutingMode = 'host' | 'path' | 'both';

export const DEFAULT_ROUTING_MODE: SiteRoutingMode = 'host';
export const DEV_ROUTING_MODE: SiteRoutingMode = 'path';

/** Routing mode resolved from settings plus NODE_ENV. 'path' is the development default. */
export function resolveRoutingMode(mode: SiteRoutingMode | null | undefined, nodeEnv: string): SiteRoutingMode {
  if (mode === 'host' || mode === 'path' || mode === 'both') return mode;
  return nodeEnv === 'development' ? DEV_ROUTING_MODE : DEFAULT_ROUTING_MODE;
}

/** Reads the install routing mode from env (`CMS_ROUTING_MODE`), falling back to the NODE_ENV default. */
export function getRoutingMode(): SiteRoutingMode {
  const env = process.env.CMS_ROUTING_MODE?.toLowerCase();
  if (env === 'host' || env === 'path' || env === 'both') return env;
  return resolveRoutingMode(undefined, process.env.NODE_ENV ?? 'development');
}

/** Resolves the install's routing mode ('host' | 'path' | 'both'). */
export function routingMode(): SiteRoutingMode {
  return getRoutingMode();
}

/**
 * Strips the site segment from public path segments in path/both mode
 * (`/{site}/{locale}/{slug}`) so the remainder parses as locale + slug. In host
 * mode the segments are returned unchanged.
 */
export function sitePathSegments(
  pathname: string,
  site: { slug: string | null }
): string[] {
  const mode = getRoutingMode();
  const segments = pathname.split('/').filter(Boolean);
  if ((mode === 'path' || mode === 'both') && site.slug && segments[0] === site.slug) {
    return segments.slice(1);
  }
  return segments;
}
