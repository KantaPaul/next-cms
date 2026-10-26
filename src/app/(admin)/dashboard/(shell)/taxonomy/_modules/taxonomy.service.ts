import 'server-only';
import { and, asc, count, eq, isNull, ne } from 'drizzle-orm';
import { db } from '@/db';
import { categories, pageCategories, pageTags, tags } from '@/db/schema';
import { ApplicationException, NotFoundException } from '@/lib/utils/error';
import { auditService } from '@/server/services/audit.service';
import { adminSiteId } from '@/server/services/site-context';
import type { CategoryInput, TagInput } from './taxonomy.validation';

export type CategoryNode = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  parentId: string | null;
  count: number;
  depth: number;
};

export const taxonomyService = {
  listCategories: async () => {
    const rows = await db
      .select({
        id: categories.id,
        name: categories.name,
        slug: categories.slug,
        description: categories.description,
        parentId: categories.parentId,
        count: count(pageCategories.pageId),
      })
      .from(categories)
      .leftJoin(pageCategories, eq(pageCategories.categoryId, categories.id))
      .where(
        and(isNull(categories.deletedAt), eq(categories.siteId, await adminSiteId()))
      )
      .groupBy(categories.id)
      .orderBy(asc(categories.name));

    const byParent = new Map<string | null, typeof rows>();

    for (const row of rows) {
      const key =
        row.parentId && rows.some(r => r.id === row.parentId)
          ? row.parentId
          : null;
      byParent.set(key, [...(byParent.get(key) ?? []), row]);
    }

    const tree: CategoryNode[] = [];

    const walk = (parentId: string | null, depth: number) => {
      for (const row of byParent.get(parentId) ?? []) {
        tree.push({ ...row, depth });
        walk(row.id, depth + 1);
      }
    };

    walk(null, 0);
    return tree;
  },

  listTags: async () =>
    db
      .select({
        id: tags.id,
        name: tags.name,
        slug: tags.slug,
        color: tags.color,
        count: count(pageTags.pageId),
      })
      .from(tags)
      .leftJoin(pageTags, eq(pageTags.tagId, tags.id))
      .where(and(isNull(tags.deletedAt), eq(tags.siteId, await adminSiteId())))
      .groupBy(tags.id)
      .orderBy(asc(tags.name)),

  saveCategory: async (input: CategoryInput, userId: string) => {
    const { id, ...values } = input;
    const siteId = await adminSiteId();

    const [clash] = await db
      .select({ id: categories.id })
      .from(categories)
      .where(
        and(
          eq(categories.siteId, siteId),
          eq(categories.slug, values.slug),
          isNull(categories.deletedAt),
          id ? ne(categories.id, id) : undefined
        )
      );
    if (clash)
      throw new ApplicationException(
        `A category with slug "${values.slug}" already exists.`
      );

    if (id && values.parentId) {
      const all = await db
        .select({ id: categories.id, parentId: categories.parentId })
        .from(categories);
      let cursor: string | null | undefined = values.parentId;

      while (cursor) {
        if (cursor === id)
          throw new ApplicationException(
            'A category cannot be nested inside itself.'
          );
        cursor = all.find(c => c.id === cursor)?.parentId;
      }
    }

    const [row] = id
      ? await db
          .update(categories)
          .set(values)
          .where(and(eq(categories.id, id), eq(categories.siteId, siteId)))
          .returning()
      : await db
          .insert(categories)
          .values({ ...values, siteId, createdBy: userId })
          .returning();

    if (!row) throw new NotFoundException('Category not found');
    await auditService.log({
      actorId: userId,
      action: id ? 'update' : 'create',
      targetType: 'taxonomy',
      targetId: row.id,
      targetName: `Category: ${row.name}`,
    });
    return row;
  },

  deleteCategory: async (id: string, userId: string) => {
    const [row] = await db
      .delete(categories)
      .where(and(eq(categories.id, id), eq(categories.siteId, await adminSiteId())))
      .returning();
    if (!row) throw new NotFoundException('Category not found');
    await auditService.log({
      actorId: userId,
      action: 'delete',
      targetType: 'taxonomy',
      targetId: id,
      targetName: `Category: ${row.name}`,
    });
    return row;
  },

  saveTag: async (input: TagInput, userId: string) => {
    const { id, ...values } = input;
    const siteId = await adminSiteId();

    const [clash] = await db
      .select({ id: tags.id })
      .from(tags)
      .where(
        and(
          eq(tags.siteId, siteId),
          eq(tags.slug, values.slug),
          isNull(tags.deletedAt),
          id ? ne(tags.id, id) : undefined
        )
      );
    if (clash)
      throw new ApplicationException(
        `A tag with slug "${values.slug}" already exists.`
      );

    const [row] = id
      ? await db
          .update(tags)
          .set(values)
          .where(and(eq(tags.id, id), eq(tags.siteId, siteId)))
          .returning()
      : await db
          .insert(tags)
          .values({ ...values, siteId, createdBy: userId })
          .returning();

    if (!row) throw new NotFoundException('Tag not found');
    await auditService.log({
      actorId: userId,
      action: id ? 'update' : 'create',
      targetType: 'taxonomy',
      targetId: row.id,
      targetName: `Tag: ${row.name}`,
    });
    return row;
  },

  deleteTag: async (id: string, userId: string) => {
    const [row] = await db
      .delete(tags)
      .where(and(eq(tags.id, id), eq(tags.siteId, await adminSiteId())))
      .returning();
    if (!row) throw new NotFoundException('Tag not found');
    await auditService.log({
      actorId: userId,
      action: 'delete',
      targetType: 'taxonomy',
      targetId: id,
      targetName: `Tag: ${row.name}`,
    });
    return row;
  },
};
