import 'server-only';
import { and, asc, count, desc, eq, isNull } from 'drizzle-orm';
import { db } from '@/db';
import { menuItems, menus, pages, seoMeta } from '@/db/schema';
import type { MenuLocationType } from '@/db/schemas/shared.schema';
import { siteContext } from './site-context';
import type { MenuWithItems } from './public-site.service';

async function published(language?: string | null) {
  const site = await siteContext.publicSite();
  return and(
    eq(pages.siteId, site.id),
    eq(pages.status, 'published'),
    eq(pages.visibility, 'public'),
    isNull(pages.deletedAt),
    language ? eq(pages.language, language) : undefined
  );
}

export const contentApiService = {
  listPublishedPages: async ({
    language,
    limit,
    offset,
  }: {
    language?: string | null;
    limit: number;
    offset: number;
  }) => {
    const where = await published(language);
    const [data, [{ total }]] = await Promise.all([
      db
        .select({
          id: pages.id,
          title: pages.title,
          slug: pages.slug,
          language: pages.language,
          isHome: pages.isHome,
          editorType: pages.editorType,
          translationGroupId: pages.translationGroupId,
          publishedAt: pages.publishedAt,
          updatedAt: pages.updatedAt,
          seoTitle: seoMeta.title,
          seoDescription: seoMeta.description,
        })
        .from(pages)
        .leftJoin(seoMeta, eq(seoMeta.pageId, pages.id))
        .where(where)
        .orderBy(desc(pages.publishedAt), asc(pages.title))
        .limit(limit)
        .offset(offset),
      db.select({ total: count() }).from(pages).where(where),
    ]);
    return { data, total };
  },

  listMenus: async (location?: MenuLocationType) => {
    const site = await siteContext.publicSite();
    const menuRows = await db
      .select()
      .from(menus)
      .where(
        and(
          eq(menus.siteId, site.id),
          isNull(menus.deletedAt),
          location ? eq(menus.location, location) : undefined
        )
      )
      .orderBy(asc(menus.title));
    if (!menuRows.length) return [];

    const itemRows = await db
      .select()
      .from(menuItems)
      .orderBy(asc(menuItems.order));
    return menuRows.map((menu): MenuWithItems => {
      const items = itemRows.filter(i => i.menuId === menu.id);
      return {
        ...menu,
        items: items
          .filter(i => !i.parentId)
          .map(item => ({
            ...item,
            children: items.filter(child => child.parentId === item.id),
          })),
      };
    });
  },
};
