import 'server-only';
import { and, eq, inArray, isNotNull, isNull } from 'drizzle-orm';
import { cache } from 'react';
import { PAGES } from '@/config/pages';
import { db } from '@/db';
import { pages, posts } from '@/db/schema';
import type { LocaleLinkMap } from '@/lib/utils/locale-links';
import { siteContext, type ResolvedSite } from '@/server/services/site-context';

type Row = {
  slug: string;
  language: string;
  group: string | null;
  isHome?: boolean;
};

/** Pairs each default-language item with its `language` translation (same translation group). */
function pair(
  rows: Row[],
  language: string,
  defaultLocale: string,
  pathFor: (row: Row) => string,
  into: Map<string, string>
) {
  const translated = new Map<string, Row>();
  for (const row of rows) {
    if (row.language === language && row.group) translated.set(row.group, row);
  }
  for (const row of rows) {
    if (row.language !== defaultLocale || !row.group) continue;
    const target = translated.get(row.group);
    if (target) into.set(pathFor(row), pathFor(target));
  }
}

export const localeLinksService = {
  /**
   * Link map for pages and posts in `language`; null for the default locale
   * (its links are already right). Paths are without the site slug.
   */
  forLanguage: cache(
    async (
      language: string | undefined,
      site?: ResolvedSite
    ): Promise<LocaleLinkMap | null> => {
      if (!language) return null;
      try {
        const resolved = site ?? (await siteContext.publicSite());
        const defaultLocale = resolved.defaultLocale;
        if (language === defaultLocale) return null;
        if (!resolved.locales.some(locale => locale.code === language)) return null;
        const languages = [defaultLocale, language];

        const [pageRows, postRows] = await Promise.all([
          db
            .select({
              slug: pages.slug,
              language: pages.language,
              group: pages.translationGroupId,
              isHome: pages.isHome,
            })
            .from(pages)
            .where(
              and(
                eq(pages.siteId, resolved.id),
                eq(pages.status, 'published'),
                isNull(pages.deletedAt),
                isNotNull(pages.translationGroupId),
                inArray(pages.language, languages)
              )
            ),
          db
            .select({
              slug: posts.slug,
              language: posts.language,
              group: posts.translationGroupId,
            })
            .from(posts)
            .where(
              and(
                eq(posts.siteId, resolved.id),
                eq(posts.status, 'published'),
                isNull(posts.deletedAt),
                isNotNull(posts.translationGroupId),
                inArray(posts.language, languages)
              )
            ),
        ]);

        const map = new Map<string, string>();
        pair(
          pageRows,
          language,
          defaultLocale,
          row => PAGES.SITE.page(row.slug, row.language, Boolean(row.isHome), defaultLocale),
          map
        );
        pair(
          postRows,
          language,
          defaultLocale,
          row => PAGES.SITE.post(row.slug, row.language, defaultLocale),
          map
        );
        return map;
      } catch {
        return null;
      }
    }
  ),
};
