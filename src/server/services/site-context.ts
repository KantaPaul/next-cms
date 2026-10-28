import 'server-only';
import { and, asc, eq, isNull, sql } from 'drizzle-orm';
import { cookies, headers } from 'next/headers';
import { cache } from 'react';
import { db } from '@/db';
import { pages, posts, siteMemberships, sites } from '@/db/schema';
import {
  DEFAULT_SITE_ID,
  DEFAULT_SITE_LOCALES,
  type SiteLocale,
} from '@/db/schemas/sites.schema';
import {
  DEFAULT_ROUTING_MODE,
  DEV_ROUTING_MODE,
  type SiteRoutingMode,
  resolveRoutingMode,
  routingMode,
  sitePathSegments,
  validateSiteSlug,
} from '@/lib/utils/site-slug';
import { notFound } from 'next/navigation';

export const SITE_COOKIE = 'cms_site';

export type ResolvedSite = {
  id: string;
  name: string;
  slug: string | null;
  primaryHost: string | null;
  extraDomains: string[];
  defaultLocale: string;
  locales: SiteLocale[];
};

export type SiteMembership = {
  siteId: string;
  siteName: string;
  slug: string | null;
  roleId: string;
  primaryHost: string | null;
};

export type SiteContextSource =
  | 'host'
  | 'path'
  | 'preview'
  | 'admin-cookie'
  | 'admin-membership'
  | 'fallback'
  | 'system';

export type SiteContext = ResolvedSite & {
  source: SiteContextSource;
};

const fallbackSite = (): ResolvedSite => ({
  id: DEFAULT_SITE_ID,
  name: 'Next CMS',
  slug: 'main',
  primaryHost: null,
  extraDomains: [],
  defaultLocale: 'en',
  locales: DEFAULT_SITE_LOCALES,
});

export function normalizeHost(value: string | null | undefined) {
  if (!value) return '';
  const first = value.split(',')[0]?.trim() ?? '';
  if (!first) return '';
  let host = first;
  // Strip scheme if accidentally passed
  if (host.includes('://')) {
    try {
      host = new URL(host).hostname;
    } catch {
      // fall through
    }
  }
  // Strip port (IPv6 safe)
  if (host.startsWith('[')) {
    const end = host.indexOf(']');
    if (end !== -1) host = host.slice(1, end);
  } else {
    host = host.replace(/:\d+$/, '');
  }
  host = host.replace(/\.$/, '').toLowerCase();
  return host;
}

export function isLocalHost(host: string) {
  if (!host) return true;
  if (host === 'localhost' || host === '::1' || host === '127.0.0.1')
    return true;
  if (host.endsWith('.local') || host.endsWith('.test')) return true;
  return false;
}

export function normalizeDomainList(value: string | null | undefined): string[] {
  if (!value) return [];
  return value
    .split(/[\s,]+/)
    .map(v => normalizeHost(v))
    .filter((v, i, arr) => v && arr.indexOf(v) === i);
}

export async function validateHostOwnership(
  host: string,
  excludeSiteId?: string
): Promise<{ ok: boolean; conflictingSiteId?: string }> {
  const h = normalizeHost(host);
  if (!h) return { ok: false };
  const rows = await db
    .select({ id: sites.id, primaryHost: sites.primaryHost, extraDomains: sites.extraDomains })
    .from(sites)
    .where(isNull(sites.deletedAt));
  for (const row of rows) {
    if (excludeSiteId && row.id === excludeSiteId) continue;
    if (normalizeHost(row.primaryHost) === h) {
      return { ok: false, conflictingSiteId: row.id };
    }
    const extras = Array.isArray(row.extraDomains) ? row.extraDomains : [];
    for (const ex of extras) {
      if (normalizeHost(ex) === h) {
        return { ok: false, conflictingSiteId: row.id };
      }
    }
  }
  return { ok: true };
}

export function isTrustedProxyHost(host: string | null | undefined): boolean {
  const h = normalizeHost(host);
  if (!h) return false;
  const trusted = process.env.CMS_TRUSTED_PROXY_HOSTS?.split(',')
    .map(x => normalizeHost(x))
    .filter(Boolean);
  if (!trusted?.length) return false;
  return trusted.includes(h);
}

function toSite(row: typeof sites.$inferSelect): ResolvedSite {
  const locales =
    Array.isArray(row.locales) && row.locales.length
      ? row.locales
      : DEFAULT_SITE_LOCALES;
  return {
    id: row.id,
    name: row.name,
    slug: row.slug ?? null,
    primaryHost: row.primaryHost,
    extraDomains: row.extraDomains ?? [],
    defaultLocale: row.defaultLocale || 'en',
    locales,
  };
}

async function fallback() {
  const row = await siteContext.getById(DEFAULT_SITE_ID);
  return row ?? fallbackSite();
}

/** Looks a site up by its URL-safe slug. Returns null for reserved/invalid/unknown slugs. */
async function getSiteBySlug(slug: string): Promise<ResolvedSite | null> {
  const valid = validateSiteSlug(slug);
  if (!valid.ok) return null;
  const [row] = await db
    .select()
    .from(sites)
    .where(and(eq(sites.slug, valid.slug), isNull(sites.deletedAt)))
    .limit(1);
  return row ? toSite(row) : null;
}

/**
 * Host with no configured site. A signed-in member sees the same site the
 * dashboard is editing (the site cookie, or their first membership).
 */
async function siteSelectedInAdmin(): Promise<ResolvedSite | null> {
  try {
    const { getSessionId, validateSession } = await import('@/lib/auth/session');
    const sessionId = await getSessionId();
    if (!sessionId) return null;
    const session = await validateSession(sessionId);
    const userId = session?.user?.id;
    if (!userId) return null;

    const siteId = await siteContext.adminSiteId(userId);
    if (!siteId || siteId === DEFAULT_SITE_ID) return null;
    return siteContext.getById(siteId);
  } catch {
    return null;
  }
}

/** Draft preview follows the page or post, so a link opened on localhost still resolves. */
async function siteFromPreview(): Promise<ResolvedSite | null> {
  try {
    const { getPreviewSession } = await import(
      '@/server/services/preview-session'
    );
    const preview = await getPreviewSession();
    if (!preview) return null;

    if (preview.pageId) {
      const [row] = await db
        .select({ siteId: pages.siteId })
        .from(pages)
        .where(eq(pages.id, preview.pageId))
        .limit(1);
      if (row) return siteContext.getById(row.siteId);
    }

    if (preview.postId) {
      const [row] = await db
        .select({ siteId: posts.siteId })
        .from(posts)
        .where(eq(posts.id, preview.postId))
        .limit(1);
      if (row) return siteContext.getById(row.siteId);
    }

    return null;
  } catch {
    return null;
  }
}

export const siteContext = {
  getById: cache(async (id: string): Promise<ResolvedSite | null> => {
    const [row] = await db
      .select()
      .from(sites)
      .where(and(eq(sites.id, id), isNull(sites.deletedAt)))
      .limit(1);
    return row ? toSite(row) : null;
  }),

  /** Host without a port matches `primary_host` or an extra domain. No match returns null. */
  matchHost: cache(async (rawHost: string | null | undefined) => {
    const host = normalizeHost(rawHost);
    if (!host) return null;
    const matches = await db
      .select()
      .from(sites)
      .where(
        and(
          isNull(sites.deletedAt),
          sql`(
            lower(${sites.primaryHost}) = ${host}
            OR ${host} = ANY (
              SELECT lower(domain) FROM unnest(coalesce(${sites.extraDomains}, '{}')) AS domain
            )
          )`
        )
      )
      .limit(2);
    if (matches.length > 1) {
      console.error(
        `[site-context] Host collision detected for "${host}": sites=${matches
          .map(m => m.id)
          .join(',')}. Falling back to the first match to avoid cross-tenant leakage.`
      );
      return matches[0] ? toSite(matches[0]) : null;
    }
    return matches[0] ? toSite(matches[0]) : null;
  }),

  /** Host match, or site `default` when the host is not assigned to a site. */
  siteForHost: cache(async (rawHost: string | null | undefined) => {
    const matched = await siteContext.matchHost(rawHost);
    if (matched) return matched;
    const policy = getUnknownHostPolicy();
    if (policy === 'deny') {
      throw new Error(`Unknown host: ${normalizeHost(rawHost)}`);
    }
    return fallback();
  }),

  /**
   * Public pages. A configured host always wins.
   * On an unassigned host such as localhost, a draft preview uses that page's site,
   * and a signed-in member sees the site chosen in the dashboard.
   */
  publicSite: cache(async (): Promise<SiteContext> => {
    const headerStore = await headers();
    const routing = routingMode();

    // Path-based routing ({/site}/...): the proxy strips any client-sent
    // site headers and sets x-cms-site-slug from the first path segment.
    // Resolve from the slug before the host. An unknown slug returns 404
    // and never falls back to another site.
    if (routing === 'path' || routing === 'both') {
      const siteSlug = headerStore.get('x-cms-site-slug')?.trim();
      if (siteSlug) {
        const site = await getSiteBySlug(siteSlug);
        if (site) return { ...site, source: 'path' as const };
        notFound();
      }
    }

    const rawHostHeader =
      headerStore.get('x-cms-host') ??
      headerStore.get('x-forwarded-host') ??
      headerStore.get('host');
    const remoteIp =
      headerStore.get('x-real-ip') ??
      headerStore.get('x-forwarded-for')?.split(',')[0]?.trim();
    const host = rawHostHeader;
    // Only trust forwarded headers if from trusted proxy
    if (
      (headerStore.get('x-cms-host') || headerStore.get('x-forwarded-host')) &&
      !isTrustedProxyHost(remoteIp ?? normalizeHost(rawHostHeader))
    ) {
      // Don't trust client-supplied forwarded headers unless trusted
      const matched = await siteContext.matchHost(headerStore.get('host'));
      if (matched) {
        const policy = getUnknownHostPolicy();
        if (policy === 'deny' && !matched) {
          throw new Error(`Unknown host: ${normalizeHost(headerStore.get('host'))}`);
        }
        return { ...matched, source: 'host' as const };
      }
    } else {
      const matched = await siteContext.matchHost(host);
      if (matched) {
        return { ...matched, source: 'host' as const };
      }
    }
    const policy = getUnknownHostPolicy();
    if (policy === 'deny') {
      throw new Error(`Unknown host: ${normalizeHost(host)}`);
    }
    const preview = await siteFromPreview();
    if (preview) return { ...preview, source: 'preview' as const };
    const admin = await siteSelectedInAdmin();
    if (admin) return { ...admin, source: 'admin-cookie' as const };
    const fb = await fallback();
    return { ...fb, source: 'fallback' as const };
  }),

  /** Canonical public site context resolver. */
  publicSiteContext: cache(async (): Promise<SiteContext> => {
    return siteContext.publicSite();
  }),

  memberships: cache(async (userId: string): Promise<SiteMembership[]> => {
    return db
      .select({
        siteId: siteMemberships.siteId,
        siteName: sites.name,
        slug: sites.slug,
        roleId: siteMemberships.roleId,
        primaryHost: sites.primaryHost,
      })
      .from(siteMemberships)
      .innerJoin(sites, eq(sites.id, siteMemberships.siteId))
      .where(
        and(eq(siteMemberships.userId, userId), isNull(siteMemberships.deletedAt))
      )
      .orderBy(asc(sites.name));
  }),

  adminSiteId: cache(async (userId: string) => {
    const rows = await siteContext.memberships(userId);
    const cookie = (await cookies()).get(SITE_COOKIE)?.value;
    if (cookie && rows.some(row => row.siteId === cookie)) return cookie;
    return rows[0]?.siteId ?? DEFAULT_SITE_ID;
  }),

  adminSite: cache(async (userId: string): Promise<SiteContext> => {
    const id = await siteContext.adminSiteId(userId);
    const site = (await siteContext.getById(id)) ?? (await fallback());
    const rows = await siteContext.memberships(userId);
    const cookie = (await cookies()).get(SITE_COOKIE)?.value;
    const source: SiteContextSource =
      cookie && rows.some(row => row.siteId === cookie)
        ? 'admin-cookie'
        : rows[0]?.siteId === id
        ? 'admin-membership'
        : 'fallback';
    return { ...site, source };
  }),

  /** Canonical dashboard/admin site context resolver. */
  adminSiteContext: cache(async (userId: string): Promise<SiteContext> => {
    return siteContext.adminSite(userId);
  }),

  /** Canonical preview site context resolver. */
  previewSiteContext: cache(async (): Promise<SiteContext | null> => {
    const site = await siteFromPreview();
    if (!site) return null;
    return { ...site, source: 'preview' as const };
  }),

  /**
   * Canonical system/site context resolver for background jobs/cron where
   * there is no request session or headers.
   */
  systemSiteContext: cache(
    async (siteId?: string | null): Promise<SiteContext> => {
      if (siteId) {
        const site = await siteContext.getById(siteId);
        if (site) return { ...site, source: 'system' as const };
      }
      const fb = await fallback();
      return { ...fb, source: 'system' as const };
    }
  ),

  /** Resolve all sites for system operations. */
  allSites: cache(async (): Promise<ResolvedSite[]> => {
    const rows = await db
      .select()
      .from(sites)
      .where(isNull(sites.deletedAt))
      .orderBy(asc(sites.name));
    return rows.map(toSite);
  }),
};

export async function resolveSiteContext(input: {
  kind: 'public' | 'admin' | 'preview' | 'system';
  userId?: string;
  siteId?: string;
  host?: string | null;
}): Promise<SiteContext | null> {
  if (input.kind === 'public') {
    return siteContext.publicSite();
  }
  if (input.kind === 'admin') {
    if (!input.userId) return null;
    return siteContext.adminSite(input.userId);
  }
  if (input.kind === 'preview') {
    return siteContext.previewSiteContext();
  }
  if (input.kind === 'system') {
    return siteContext.systemSiteContext(input.siteId);
  }
  return null;
}

export async function adminSiteId() {
  const { getCurrentUserAndTeamId } = await import('@/lib/auth');
  const { userId } = await getCurrentUserAndTeamId();
  return siteContext.adminSiteId(userId);
}

export async function getPublicSiteContext(): Promise<SiteContext> {
  return siteContext.publicSite();
}

export async function getAdminSiteContext(
  userId: string
): Promise<SiteContext> {
  return siteContext.adminSite(userId);
}

export type UnknownHostPolicy = 'fallback-default' | 'deny' | 'redirect';

export const DEFAULT_UNKNOWN_HOST_POLICY: UnknownHostPolicy = 'fallback-default';

export function getUnknownHostPolicy(): UnknownHostPolicy {
  const policy = process.env.CMS_UNKNOWN_HOST_POLICY?.toLowerCase();
  if (policy === 'deny' || policy === 'redirect') return policy;
  return DEFAULT_UNKNOWN_HOST_POLICY;
}

export { routingMode, sitePathSegments } from '@/lib/utils/site-slug';

/**
 * Returns the site slug to prefix public URLs with in path/both mode, or
 * undefined in host mode. Public URL builders pass this to `PAGES.SITE.*`.
 */
export function siteSlugPrefix(site: ResolvedSite): string | undefined {
  const mode = routingMode();
  if ((mode === 'path' || mode === 'both') && site.slug) return site.slug;
  return undefined;
}

/** Looks a site up by its URL-safe slug (null for reserved/invalid/unknown). */
export async function siteBySlug(slug: string): Promise<ResolvedSite | null> {
  return getSiteBySlug(slug);
}

