import 'server-only';
import { and, asc, eq, inArray, isNull, type SQL } from 'drizzle-orm';
import { cache } from 'react';
import { normalizeContent } from '@/builder/data';
import { db } from '@/db';
import { menuItems, menus, pageContents, pages, seoMeta } from '@/db/schema';
import { DEFAULT_LANGUAGE, LANGUAGE_CODES } from '@/db/schemas/shared.schema';
import { siteContext, type ResolvedSite } from '@/server/services/site-context';

export type SiteRoute = { language: string; slug: string | null };

type LocaleSite = {
  defaultLocale: string;
  locales: { code: string }[];
};

/** Maps URL segments to a language and slug (`null` slug means the language's home page). */
export function resolveRoute(
  segments: string[] = [],
  site?: LocaleSite
): SiteRoute | null {
  const defaultLocale = site?.defaultLocale ?? DEFAULT_LANGUAGE;
  const codes = site?.locales.map(locale => locale.code) ?? LANGUAGE_CODES;
  const parts = segments.map(decodeURIComponent);
  if (parts.length === 0) return { language: defaultLocale, slug: null };

  const [first, second] = parts;
  const isLanguage = first !== defaultLocale && codes.includes(first);

  if (parts.length === 1)
    return isLanguage
      ? { language: first, slug: null }
      : { language: defaultLocale, slug: first };
  if (parts.length === 2 && isLanguage)
    return { language: first, slug: second };
  return null;
}

const pageSelect = {
  id: pages.id,
  siteId: pages.siteId,
  title: pages.title,
  slug: pages.slug,
  status: pages.status,
  visibility: pages.visibility,
  editorType: pages.editorType,
  language: pages.language,
  isHome: pages.isHome,
  translationGroupId: pages.translationGroupId,
  publishedAt: pages.publishedAt,
  updatedAt: pages.updatedAt,
};

async function findPage(route: SiteRoute, extra?: SQL) {
  try {
    const site = await siteContext.publicSite();
    const where = and(
      eq(pages.siteId, site.id),
      eq(pages.language, route.language),
      isNull(pages.deletedAt),
      route.slug === null ? eq(pages.isHome, true) : eq(pages.slug, route.slug),
      extra
    );
    const [page] = await db
      .select(pageSelect)
      .from(pages)
      .where(where)
      .limit(1);
    return page ?? null;
  } catch {
    return null;
  }
}

async function loadContent(pageId: string, kind: 'draft' | 'published') {
  try {
    const [row] = await db
      .select({ content: pageContents.content })
      .from(pageContents)
      .where(and(eq(pageContents.pageId, pageId), eq(pageContents.kind, kind)))
      .limit(1);
    return row?.content ?? null;
  } catch {
    return null;
  }
}

async function loadSeo(pageId: string) {
  try {
    const [row] = await db
      .select()
      .from(seoMeta)
      .where(eq(seoMeta.pageId, pageId))
      .limit(1);
    return row ?? null;
  } catch {
    return null;
  }
}

async function loadAlternates(
  page: { id: string; siteId: string; translationGroupId: string | null },
  publishedOnly: boolean
) {
  if (!page.translationGroupId) return [];
  return db
    .select({
      language: pages.language,
      slug: pages.slug,
      isHome: pages.isHome,
    })
    .from(pages)
    .where(
      and(
        eq(pages.siteId, page.siteId),
        eq(pages.translationGroupId, page.translationGroupId),
        isNull(pages.deletedAt),
        publishedOnly
          ? and(eq(pages.status, 'published'), eq(pages.visibility, 'public'))
          : undefined
      )
    );
}

export const publicSiteService = {
  /** Published, public page for a route, with its published content. */
  getPublished: cache(async (language: string, slug: string | null) => {
    const page = await findPage(
      { language, slug },
      and(eq(pages.status, 'published'), eq(pages.visibility, 'public'))
    );
    if (!page) return null;
    const [content, seo, alternates] = await Promise.all([
      loadContent(page.id, 'published'),
      loadSeo(page.id),
      loadAlternates(page, true),
    ]);
    return {
      ...page,
      content: normalizeContent(page.editorType, content),
      seo,
      alternates,
      isDraft: false as const,
    };
  }),

  /** Draft version of the page at a route, only when it is the page being previewed. */
  getDraft: cache(
    async (language: string, slug: string | null, previewPageId: string) => {
      const page = await findPage(
        { language, slug },
        eq(pages.id, previewPageId)
      );
      if (!page) return null;
      const [draft, published, seo, alternates] = await Promise.all([
        loadContent(page.id, 'draft'),
        loadContent(page.id, 'published'),
        loadSeo(page.id),
        loadAlternates(page, false),
      ]);
      return {
        ...page,
        content: normalizeContent(page.editorType, draft ?? published),
        seo,
        alternates,
        isDraft: true as const,
      };
    }
  ),

  getPageRouteById: async (id: string) => {
    const [page] = await db
      .select({
        slug: pages.slug,
        language: pages.language,
        isHome: pages.isHome,
      })
      .from(pages)
      .where(and(eq(pages.id, id), isNull(pages.deletedAt)))
      .limit(1);
    return page ?? null;
  },

  listPublishedForSitemap: async () =>
    db
      .select({
        id: pages.id,
        slug: pages.slug,
        language: pages.language,
        isHome: pages.isHome,
        updatedAt: pages.updatedAt,
        publishedAt: pages.publishedAt,
        translationGroupId: pages.translationGroupId,
        noIndex: seoMeta.noIndex,
      })
      .from(pages)
      .leftJoin(seoMeta, eq(seoMeta.pageId, pages.id))
      .where(
        and(
          eq(pages.siteId, (await siteContext.publicSite()).id),
          eq(pages.status, 'published'),
          eq(pages.visibility, 'public'),
          isNull(pages.deletedAt)
        )
      ),

  getMenusById: cache(async (ids: (string | null | undefined)[]) => {
    try {
      const wanted = ids.filter((id): id is string => !!id);
      if (!wanted.length) return {};
      const [menuRows, itemRows] = await Promise.all([
        db.select().from(menus).where(inArray(menus.id, wanted)),
        db
          .select()
          .from(menuItems)
          .where(inArray(menuItems.menuId, wanted))
          .orderBy(asc(menuItems.order)),
      ]);

      return Object.fromEntries(
        menuRows.map(menu => {
          const items = itemRows.filter(i => i.menuId === menu.id);
          const tree = items
            .filter(i => !i.parentId)
            .map(item => ({
              ...item,
              children: items.filter(child => child.parentId === item.id),
            }));
          return [menu.id, { ...menu, items: tree }];
        })
      ) as Record<string, MenuWithItems>;
    } catch {
      return {};
    }
  }),

  /** Header or footer menu for this locale, then the site's default locale. */
  menuFor: cache(
    async (location: 'header' | 'footer', language: string, site?: ResolvedSite) => {
      const resolved = site ?? (await siteContext.publicSite());
      const languages = [language, resolved.defaultLocale].filter(
        (code, index, all) => all.indexOf(code) === index
      );
      for (const code of languages) {
        const [menu] = await db
          .select()
          .from(menus)
          .where(
            and(
              eq(menus.siteId, resolved.id),
              eq(menus.location, location),
              eq(menus.language, code),
              isNull(menus.deletedAt)
            )
          )
          .limit(1);
        if (!menu) continue;
        const loaded = await publicSiteService.getMenusById([menu.id]);
        if (loaded[menu.id]) return loaded[menu.id];
      }
      return null;
    }
  ),
};

export type MenuItemNode = typeof menuItems.$inferSelect & {
  children: (typeof menuItems.$inferSelect)[];
};
export type MenuWithItems = typeof menus.$inferSelect & {
  items: MenuItemNode[];
};
export type PublicPage = NonNullable<
  Awaited<ReturnType<typeof publicSiteService.getPublished>>
>;
