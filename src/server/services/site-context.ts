import 'server-only';
import { and, asc, eq, isNull, sql } from 'drizzle-orm';
import { cookies, headers } from 'next/headers';
import { cache } from 'react';
import { db } from '@/db';
import { siteMemberships, sites } from '@/db/schema';
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

export const siteContext = {
  getById: cache(async (id: string): Promise<ResolvedSite | null> => {
    const [row] = await db
      .select()
      .from(sites)
      .where(and(eq(sites.id, id), isNull(sites.deletedAt)))
      .limit(1);
    return row ? toSite(row) : null;
  }),

  /** Host without a port matches `primary_host` or an extra domain. Otherwise site `default`. */
  siteForHost: cache(async (rawHost: string | null | undefined) => {
    const host = normalizeHost(rawHost);
    if (host) {
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
      if (match) return toSite(match);
    }
    return fallback();
  }),

  publicSite: cache(async () => {
    const headerStore = await headers();
    const host =
      headerStore.get('x-cms-host') ??
      headerStore.get('x-forwarded-host') ??
      headerStore.get('host');
    return siteContext.siteForHost(host);
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
