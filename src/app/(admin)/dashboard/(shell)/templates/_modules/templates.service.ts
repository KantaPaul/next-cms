import 'server-only';
import { asc, countDistinct, desc, eq, sql } from 'drizzle-orm';
import {
  type BuilderData,
  type BuilderItem,
  normalizeContent,
} from '@/builder/data';
import { PERMISSIONS } from '@/config/permissions';
import { db } from '@/db';
import { globalBlocks, pageContents, pageTemplates, users } from '@/db/schema';
import { ApplicationException, NotFoundException } from '@/lib/utils/error';
import { revalidatePublicSite } from '@/lib/utils/revalidate-site';
import {
  accessService,
  type UserAccess,
} from '@/server/services/access.service';
import { auditService } from '@/server/services/audit.service';

const countBlocks = (content: unknown) =>
  content &&
  typeof content === 'object' &&
  Array.isArray((content as BuilderData).content)
    ? (content as BuilderData).content.length
    : 0;

export const templatesService = {
  listTemplates: async () => {
    const rows = await db
      .select({
        id: pageTemplates.id,
        name: pageTemplates.name,
        description: pageTemplates.description,
        category: pageTemplates.category,
        editorType: pageTemplates.editorType,
        thumbnailUrl: pageTemplates.thumbnailUrl,
        isSystem: pageTemplates.isSystem,
        content: pageTemplates.content,
      })
      .from(pageTemplates)
      .orderBy(desc(pageTemplates.isSystem), asc(pageTemplates.name));

    return rows.map(({ content, ...row }) => ({
      ...row,
      blockCount: countBlocks(content),
      blockTypes:
        (content as BuilderData | null)?.content?.map(b => b.type) ?? [],
    }));
  },

  /** Saves a page's current draft as a reusable template. */
  saveTemplate: async (
    input: {
      name: string;
      description?: string | null;
      category?: string;
      content: unknown;
      editorType: 'builder' | 'richtext';
    },
    access: UserAccess
  ) => {
    await accessService.assertPermission(
      access.userId,
      PERMISSIONS.PAGES_CREATE
    );
    const [row] = await db
      .insert(pageTemplates)
      .values({
        name: input.name,
        description: input.description ?? null,
        category: input.category ?? 'Custom',
        editorType: input.editorType,
        content: normalizeContent(input.editorType, input.content) as object,
        createdBy: access.userId,
      })
      .returning();
    await auditService.log({
      actorId: access.userId,
      action: 'create',
      targetType: 'template',
      targetId: row.id,
      targetName: row.name,
    });
    return row;
  },

  deleteTemplate: async ({ id }: { id: string }, access: UserAccess) => {
    await accessService.assertPermission(
      access.userId,
      PERMISSIONS.SETTINGS_MANAGE
    );
    const [row] = await db
      .select()
      .from(pageTemplates)
      .where(eq(pageTemplates.id, id));
    if (!row) throw new NotFoundException('Template not found');
    if (row.isSystem)
      throw new ApplicationException('Starter templates cannot be deleted.');
    await db.delete(pageTemplates).where(eq(pageTemplates.id, id));
    await auditService.log({
      actorId: access.userId,
      action: 'delete',
      targetType: 'template',
      targetId: id,
      targetName: row.name,
    });
    return row;
  },

  getTemplate: async (id: string) => {
    const [row] = await db
      .select()
      .from(pageTemplates)
      .where(eq(pageTemplates.id, id));
    return row ?? null;
  },

  updateTemplate: async (
    input: {
      id: string;
      content: unknown;
      name?: string;
      description?: string | null;
      category?: string;
    },
    access: UserAccess
  ) => {
    await accessService.assertPermission(
      access.userId,
      PERMISSIONS.PAGES_CREATE
    );
    const [existing] = await db
      .select()
      .from(pageTemplates)
      .where(eq(pageTemplates.id, input.id));
    if (!existing) throw new NotFoundException('Template not found');
    if (existing.isSystem)
      throw new ApplicationException('Starter templates cannot be edited.');
    const [row] = await db
      .update(pageTemplates)
      .set({
        content: normalizeContent(existing.editorType, input.content) as object,
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.description !== undefined
          ? { description: input.description }
          : {}),
        ...(input.category !== undefined ? { category: input.category } : {}),
      })
      .where(eq(pageTemplates.id, input.id))
      .returning();
    if (!row) throw new NotFoundException('Template not found');
    await auditService.log({
      actorId: access.userId,
      action: 'update',
      targetType: 'template',
      targetId: row.id,
      targetName: row.name,
    });
    return row;
  },

  listGlobalBlocks: async () =>
    db
      .select({
        id: globalBlocks.id,
        name: globalBlocks.name,
        category: globalBlocks.category,
        content: globalBlocks.content,
        updatedAt: globalBlocks.updatedAt,
        createdByName: users.name,
      })
      .from(globalBlocks)
      .leftJoin(users, eq(users.id, globalBlocks.createdBy))
      .orderBy(asc(globalBlocks.name)),

  /** Number of pages whose draft or published content references each global block. */
  globalBlockUsage: async () => {
    const rows = await db
      .select({
        id: globalBlocks.id,
        pages: countDistinct(pageContents.pageId),
      })
      .from(globalBlocks)
      .leftJoin(
        pageContents,
        sql`${pageContents.content}::text like '%"globalBlockId": "' || ${globalBlocks.id} || '"%'
          or ${pageContents.content}::text like '%"globalBlockId":"' || ${globalBlocks.id} || '"%'`
      )
      .groupBy(globalBlocks.id);
    return Object.fromEntries(rows.map(r => [r.id, r.pages])) as Record<
      string,
      number
    >;
  },

  renameGlobalBlock: async (
    input: { id: string; name: string; category: string },
    access: UserAccess
  ) => {
    await accessService.assertPermission(access.userId, PERMISSIONS.PAGES_EDIT);
    const [row] = await db
      .update(globalBlocks)
      .set({ name: input.name, category: input.category || 'General' })
      .where(eq(globalBlocks.id, input.id))
      .returning();
    if (!row) throw new NotFoundException('Global block not found');
    await auditService.log({
      actorId: access.userId,
      action: 'update',
      targetType: 'global_block',
      targetId: row.id,
      targetName: row.name,
    });
    return row;
  },

  getGlobalBlock: async (id: string) => {
    const [row] = await db
      .select()
      .from(globalBlocks)
      .where(eq(globalBlocks.id, id));
    return row ?? null;
  },

  getGlobalBlockItems: (content: unknown): BuilderItem[] => {
    if (Array.isArray(content)) return content as BuilderItem[];
    if (
      content &&
      typeof content === 'object' &&
      Array.isArray((content as { content?: unknown }).content)
    ) {
      return (content as { content: BuilderItem[] }).content;
    }
    return [];
  },

  saveGlobalBlock: async (
    input: {
      id?: string;
      name: string;
      category?: string;
      content:
        | BuilderItem[]
        | { content: BuilderItem[]; zones?: Record<string, BuilderItem[]> };
    },
    access: UserAccess
  ) => {
    await accessService.assertPermission(access.userId, PERMISSIONS.PAGES_EDIT);
    const contentItems = Array.isArray(input.content)
      ? input.content
      : input.content?.content;
    // Allow empty body only when creating; the editor refuses to save until a section is added.
    if (!contentItems?.length && input.id) {
      throw new ApplicationException(
        'A global block needs at least one section.'
      );
    }

    const values = {
      name: input.name,
      category: input.category ?? 'General',
      content: input.content as object,
    };
    const [row] = input.id
      ? await db
          .update(globalBlocks)
          .set(values)
          .where(eq(globalBlocks.id, input.id))
          .returning()
      : await db
          .insert(globalBlocks)
          .values({ ...values, createdBy: access.userId })
          .returning();
    if (!row) throw new NotFoundException('Global block not found');

    await auditService.log({
      actorId: access.userId,
      action: input.id ? 'update' : 'create',
      targetType: 'global_block',
      targetId: row.id,
      targetName: row.name,
    });
    if (input.id) revalidatePublicSite();
    return row;
  },

  deleteGlobalBlock: async ({ id }: { id: string }, access: UserAccess) => {
    await accessService.assertPermission(
      access.userId,
      PERMISSIONS.PAGES_DELETE
    );
    const [row] = await db
      .delete(globalBlocks)
      .where(eq(globalBlocks.id, id))
      .returning();
    if (!row) throw new NotFoundException('Global block not found');
    await auditService.log({
      actorId: access.userId,
      action: 'delete',
      targetType: 'global_block',
      targetId: id,
      targetName: row.name,
    });
    revalidatePublicSite();
    return row;
  },
};

export type TemplateListItem = Awaited<
  ReturnType<typeof templatesService.listTemplates>
>[number];
export type GlobalBlockListItem = Awaited<
  ReturnType<typeof templatesService.listGlobalBlocks>
>[number];
