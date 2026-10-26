import 'server-only';
import { and, asc, count, eq, isNull } from 'drizzle-orm';
import { db } from '@/db';
import { menuItems, menus, pages } from '@/db/schema';
import type { MenuLocationType } from '@/db/schemas/shared.schema';
import { NotFoundException } from '@/lib/utils/error';
import { revalidatePublicSite } from '@/lib/utils/revalidate-site';
import { auditService } from '@/server/services/audit.service';
import { adminSiteId } from '@/server/services/site-context';

export type MenuItemInput = {
  label: string;
  url: string;
  target: '_self' | '_blank';
  badge?: string | null;
  children?: Omit<MenuItemInput, 'children'>[];
};

export const menusService = {
  list: async () =>
    db
      .select({
        id: menus.id,
        title: menus.title,
        location: menus.location,
        language: menus.language,
        items: count(menuItems.id),
      })
      .from(menus)
      .leftJoin(menuItems, eq(menuItems.menuId, menus.id))
      .where(and(isNull(menus.deletedAt), eq(menus.siteId, await adminSiteId())))
      .groupBy(menus.id)
      .orderBy(asc(menus.title)),

  getWithItems: async (id: string) => {
    const [menu] = await db
      .select()
      .from(menus)
      .where(and(eq(menus.id, id), eq(menus.siteId, await adminSiteId())))
      .limit(1);
    if (!menu) return null;
    const rows = await db
      .select()
      .from(menuItems)
      .where(eq(menuItems.menuId, id))
      .orderBy(asc(menuItems.order));
    const items = rows
      .filter(row => !row.parentId)
      .map(row => ({
        ...row,
        children: rows.filter(child => child.parentId === row.id),
      }));
    return { ...menu, items };
  },

  /** Published pages offered as one-click links in the menu editor. */
  linkablePages: async () =>
    db
      .select({
        id: pages.id,
        title: pages.title,
        slug: pages.slug,
        language: pages.language,
      })
      .from(pages)
      .where(
        and(
          eq(pages.siteId, await adminSiteId()),
          eq(pages.status, 'published'),
          isNull(pages.deletedAt)
        )
      )
      .orderBy(asc(pages.title)),

  saveMenu: async (
    input: {
      id?: string;
      title: string;
      location: MenuLocationType;
      language: string;
    },
    userId: string
  ) => {
    const siteId = await adminSiteId();
    const [row] = input.id
      ? await db
          .update(menus)
          .set({
            title: input.title,
            location: input.location,
            language: input.language,
          })
          .where(and(eq(menus.id, input.id), eq(menus.siteId, siteId)))
          .returning()
      : await db
          .insert(menus)
          .values({
            siteId,
            title: input.title,
            location: input.location,
            language: input.language,
          })
          .returning();
    if (!row) throw new NotFoundException('Menu not found');
    await auditService.log({
      actorId: userId,
      action: input.id ? 'update' : 'create',
      targetType: 'menu',
      targetId: row.id,
      targetName: row.title,
    });
    revalidatePublicSite();
    return row;
  },

  deleteMenu: async (id: string, userId: string) => {
    const [row] = await db
      .delete(menus)
      .where(and(eq(menus.id, id), eq(menus.siteId, await adminSiteId())))
      .returning();
    if (!row) throw new NotFoundException('Menu not found');
    await auditService.log({
      actorId: userId,
      action: 'delete',
      targetType: 'menu',
      targetId: id,
      targetName: row.title,
    });
    revalidatePublicSite();
    return row;
  },

  /** Replaces the menu's items with the given two-level tree, in order. */
  saveItems: async (menuId: string, items: MenuItemInput[], userId: string) => {
    await db.transaction(async tx => {
      const [menu] = await tx
        .select({ id: menus.id })
        .from(menus)
        .where(eq(menus.id, menuId))
        .limit(1);
      if (!menu) throw new NotFoundException('Menu not found');

      await tx.delete(menuItems).where(eq(menuItems.menuId, menuId));
      for (const [index, item] of items.entries()) {
        const [parent] = await tx
          .insert(menuItems)
          .values({
            menuId,
            label: item.label,
            url: item.url,
            target: item.target,
            badge: item.badge || null,
            order: index,
          })
          .returning({ id: menuItems.id });
        if (item.children?.length) {
          await tx.insert(menuItems).values(
            item.children.map((child, childIndex) => ({
              menuId,
              parentId: parent.id,
              label: child.label,
              url: child.url,
              target: child.target,
              badge: child.badge || null,
              order: childIndex,
            }))
          );
        }
      }
    });

    const [menu] = await db
      .select({ title: menus.title })
      .from(menus)
      .where(eq(menus.id, menuId));
    await auditService.log({
      actorId: userId,
      action: 'update',
      targetType: 'menu',
      targetId: menuId,
      targetName: menu?.title,
      details: `${items.length} top-level items`,
    });
    revalidatePublicSite();
    return menusService.getWithItems(menuId);
  },

  copyToLocale: async (id: string, language: string, userId: string) => {
    const source = await menusService.getWithItems(id);
    if (!source) throw new NotFoundException('Menu not found');
    const siteId = await adminSiteId();
    const created = await db.transaction(async tx => {
      const [menu] = await tx
        .insert(menus)
        .values({
          siteId,
          title: `${source.title} (${language})`,
          location: source.location,
          language,
        })
        .returning();
      for (const [index, item] of source.items.entries()) {
        const [parent] = await tx
          .insert(menuItems)
          .values({
            menuId: menu.id,
            label: item.label,
            url: item.url,
            target: item.target,
            badge: item.badge,
            order: index,
          })
          .returning({ id: menuItems.id });
        if (item.children.length) {
          await tx.insert(menuItems).values(
            item.children.map((child, childIndex) => ({
              menuId: menu.id,
              parentId: parent.id,
              label: child.label,
              url: child.url,
              target: child.target,
              badge: child.badge,
              order: childIndex,
            }))
          );
        }
      }
      return menu;
    });
    await auditService.log({
      actorId: userId,
      action: 'create',
      targetType: 'menu',
      targetId: created.id,
      targetName: created.title,
      details: `Copied into ${language}`,
    });
    revalidatePublicSite();
    return created;
  },
};

export type MenuDetail = NonNullable<
  Awaited<ReturnType<typeof menusService.getWithItems>>
>;
export type MenuSummary = Awaited<ReturnType<typeof menusService.list>>[number];
