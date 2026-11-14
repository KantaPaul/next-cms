import 'server-only';
import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { cache } from 'react';
import { getCurrentUserAndTeamId } from '@/lib/auth';
import { adminHref } from '@/lib/locale/admin-href';
import { siteContext } from '@/server/services/site-context';

export const ADMIN_LOCALE_HEADER = 'x-cms-admin-locale';

/**
 * Returns the active admin content locale for the current request.
 * Reads the proxy-injected `x-cms-admin-locale` header, validates it against
 * the active site's configured locales (404s on unknown codes), and falls back
 * to the site's defaultLocale when no prefix was present.
 */
export const adminLocale = cache(async (): Promise<string> => {
  const [{ userId }, headerList] = await Promise.all([
    getCurrentUserAndTeamId(),
    headers(),
  ]);
  const site = await siteContext.adminSite(userId);
  const raw = headerList.get(ADMIN_LOCALE_HEADER)?.trim();
  if (!raw) return site.defaultLocale;

  const matched = site.locales.some((l) => l.code === raw);
  if (!matched) {
    notFound();
  }
  return raw;
});

/**
 * Server-side redirect that preserves the current admin content locale prefix.
 */
export async function adminRedirect(path: string): Promise<never> {
  const { userId } = await getCurrentUserAndTeamId();
  const [locale, site] = await Promise.all([
    adminLocale(),
    siteContext.adminSite(userId),
  ]);
  redirect(adminHref(path, locale, site.defaultLocale));
}
