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

export const SITE_COOKIE = 'cms_site';

export type ResolvedSite = {
  id: string;
  name: string;
  primaryHost: string | null;
  extraDomains: string[];
  defaultLocale: string;
  locales: SiteLocale[];
};

export type SiteMembership = {
  siteId: string;
  siteName: string;
  roleId: string;
  primaryHost: string | null;
};

const fallbackSite = (): ResolvedSite => ({
  id: DEFAULT_SITE_ID,
  name: 'Next CMS',
  primaryHost: null,
  extraDomains: [],
  defaultLocale: 'en',
  locales: DEFAULT_SITE_LOCALES,
});

export function normalizeHost(value: string | null | undefined) {
  if (!value) return '';
  const first = value.split(',')[0]?.trim() ?? '';
  return first.replace(/:\d+$/, '').replace(/\.$/, '').toLowerCase();
}

function toSite(row: typeof sites.$inferSelect): ResolvedSite {
  const locales =
    Array.isArray(row.locales) && row.locales.length
      ? row.locales
      : DEFAULT_SITE_LOCALES;
  return {
    id: row.id,
    name: row.name,
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
    const [match] = await db
      .select()
      .from(sites)
      .where(
        and(
          isNull(sites.deletedAt),
          sql`(
            lower(${sites.primaryHost}) = ${host}
            OR ${host} = ANY (
              SELECT lower(domain) FROM unnest(${sites.extraDomains}) AS domain
            )
          )`
        )
      )
      .limit(1);
    return match ? toSite(match) : null;
  }),

  /** Host match, or site `default` when the host is not assigned to a site. */
  siteForHost: cache(async (rawHost: string | null | undefined) => {
    return (await siteContext.matchHost(rawHost)) ?? fallback();
  }),

  /**
   * Public pages. A configured host always wins.
   * On an unassigned host such as localhost, a draft preview uses that page's site,
   * and a signed-in member sees the site chosen in the dashboard.
   */
  publicSite: cache(async () => {
    const headerStore = await headers();
    const host =
      headerStore.get('x-cms-host') ??
      headerStore.get('x-forwarded-host') ??
      headerStore.get('host');
    const matched = await siteContext.matchHost(host);
    if (matched) return matched;
    return (
      (await siteFromPreview()) ?? (await siteSelectedInAdmin()) ?? fallback()
    );
  }),

  memberships: cache(async (userId: string): Promise<SiteMembership[]> => {
    return db
      .select({
        siteId: siteMemberships.siteId,
        siteName: sites.name,
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

  adminSite: cache(async (userId: string) => {
    const id = await siteContext.adminSiteId(userId);
    return (await siteContext.getById(id)) ?? fallback();
  }),
};

export async function adminSiteId() {
  const { getCurrentUserAndTeamId } = await import('@/lib/auth');
  const { userId } = await getCurrentUserAndTeamId();
  return siteContext.adminSiteId(userId);
}
