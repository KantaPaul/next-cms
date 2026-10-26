import 'server-only';
import { and, asc, eq } from 'drizzle-orm';
import { PAGES } from '@/config/pages';
import { db } from '@/db';
import { redirects } from '@/db/schema';
import { adminSiteId, siteContext } from '@/server/services/site-context';
import { ApplicationException } from '@/lib/utils/error';

export type RedirectOffer = { from: string; to: string };

export function normalizeSitePath(path: string) {
  const trimmed = path.trim();
  if (!trimmed.startsWith('/') || trimmed.startsWith('//') || trimmed.includes('://')) {
    throw new ApplicationException('Paths must start with a single /.');
  }
  if (trimmed.length > 1 && trimmed.endsWith('/')) return trimmed.slice(0, -1);
  return trimmed;
}

export function publicContentPath(
  kind: 'page' | 'post',
  row: { slug: string; language: string; isHome?: boolean }
) {
  return kind === 'post'
    ? PAGES.SITE.post(row.slug, row.language)
    : PAGES.SITE.page(row.slug, row.language, Boolean(row.isHome));
}

export function offerForPublishedPath(
  kind: 'page' | 'post',
  before: { status: string; slug: string; language: string; isHome?: boolean },
  after: { status: string; slug: string; language: string; isHome?: boolean }
): RedirectOffer | null {
  if (before.status !== 'published' || after.status !== 'published') return null;
  const from = publicContentPath(kind, before);
  const to = publicContentPath(kind, after);
  if (from === to) return null;
  return { from, to };
}

export const redirectsService = {
  list: async () =>
    db
      .select()
      .from(redirects)
      .where(eq(redirects.siteId, await adminSiteId()))
      .orderBy(asc(redirects.fromPath)),

  find: async (path: string) => {
    const fromPath = normalizeSitePath(path);
    const [row] = await db
      .select({ toPath: redirects.toPath, statusCode: redirects.statusCode })
      .from(redirects)
      .where(
        and(
          eq(redirects.siteId, (await siteContext.publicSite()).id),
          eq(redirects.fromPath, fromPath)
        )
      )
      .limit(1);
    return row ?? null;
  },

  create: async (input: { fromPath: string; toPath: string; statusCode?: number }) => {
    const fromPath = normalizeSitePath(input.fromPath);
    const toPath = normalizeSitePath(input.toPath);
    if (fromPath === toPath) {
      throw new ApplicationException('The source and destination must differ.');
    }
    const statusCode = input.statusCode === 302 ? 302 : 301;
    const [existing] = await db
      .select({ id: redirects.id })
      .from(redirects)
      .where(and(eq(redirects.siteId, await adminSiteId()), eq(redirects.fromPath, fromPath)))
      .limit(1);
    if (existing) {
      throw new ApplicationException(`A redirect from ${fromPath} already exists.`);
    }
    const [row] = await db
      .insert(redirects)
      .values({ siteId: await adminSiteId(), fromPath, toPath, statusCode })
      .returning();
    return row;
  },

  importCsv: async (csv: string) => {
    const lines = csv
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(Boolean);
    const start = /^from\b/i.test(lines[0] ?? '') ? 1 : 0;
    let created = 0;
    for (const line of lines.slice(start)) {
      const [from, to, status] = line.split(',').map(part => part.trim());
      if (!from || !to) continue;
      await redirectsService.create({
        fromPath: from,
        toPath: to,
        statusCode: status === '302' ? 302 : 301,
      });
      created += 1;
    }
    return { created };
  },
};
