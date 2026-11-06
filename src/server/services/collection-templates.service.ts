import 'server-only';
import { and, asc, count, desc, eq, isNull, or } from 'drizzle-orm';
import { cache } from 'react';
import { type BuilderData, isBuilderData } from '@/builder/data';
import {
  defaultPostTemplate,
  resolvePostTemplate,
} from '@/builder/post-template';
import { PERMISSIONS } from '@/config/permissions';
import { db } from '@/db';
import {
  collectionEntries,
  collectionTemplates,
  collections,
  pageContents,
} from '@/db/schema';
import { ApplicationException, NotFoundException } from '@/lib/utils/error';
import { revalidatePublicSite } from '@/lib/utils/revalidate-site';
import {
  accessService,
  type UserAccess,
} from '@/server/services/access.service';
import { auditService } from '@/server/services/audit.service';
import { adminSiteId } from '@/server/services/site-context';

type TemplateRow = typeof collectionTemplates.$inferSelect;

const sameJson = (a: unknown, b: unknown) =>
  JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

const assertCanManage = (access: UserAccess) =>
  accessService.assertPermission(access.userId, PERMISSIONS.PAGES_PUBLISH);

async function getRowOrThrow(id: string) {
  const [row] = await db
    .select()
    .from(collectionTemplates)
    .where(
      and(
        eq(collectionTemplates.id, id),
        eq(collectionTemplates.siteId, await adminSiteId())
      )
    )
    .limit(1);
  if (!row) throw new NotFoundException('Template not found');
  return row;
}

async function getDefaultRow(collectionId: string, siteId: string) {
  const [row] = await db
    .select()
    .from(collectionTemplates)
    .where(
      and(
        eq(collectionTemplates.collectionId, collectionId),
        eq(collectionTemplates.siteId, siteId),
        eq(collectionTemplates.isDefault, true)
      )
    )
    .limit(1);
  return row ?? null;
}

const editableContent = (
  row?: Pick<TemplateRow, 'content' | 'draftContent'>
): BuilderData =>
  isBuilderData(row?.draftContent)
    ? (row.draftContent as BuilderData)
    : resolvePostTemplate(row?.content);

const audit = (
  access: UserAccess,
  action: 'create' | 'update' | 'publish' | 'delete',
  row: Pick<TemplateRow, 'id' | 'name'>,
  details?: string
) =>
  auditService.log({
    actorId: access.userId,
    action,
    targetType: 'template',
    targetId: row.id,
    targetName: `Entry template: ${row.name}`,
    details,
  });

export const collectionTemplatesService = {
  /** Every template for this post type with its publish state and usage count. */
  list: async (collectionId: string) => {
    const siteId = await adminSiteId();
    const [rows, usage] = await Promise.all([
      db
        .select()
        .from(collectionTemplates)
        .where(
          and(
            eq(collectionTemplates.collectionId, collectionId),
            eq(collectionTemplates.siteId, siteId)
          )
        )
        .orderBy(desc(collectionTemplates.isDefault), asc(collectionTemplates.name)),
      db
        .select({ templateId: collectionEntries.templateId, total: count() })
        .from(collectionEntries)
        .where(
          and(
            eq(collectionEntries.collectionId, collectionId),
            isNull(collectionEntries.deletedAt),
            eq(collectionEntries.layout, 'template')
          )
        )
        .groupBy(collectionEntries.templateId),
    ]);
    const unassigned = usage.find(u => u.templateId === null)?.total ?? 0;

    return rows.map(row => ({
      id: row.id,
      collectionId: row.collectionId,
      name: row.name,
      description: row.description,
      isDefault: row.isDefault,
      isPublished: isBuilderData(row.content),
      hasUnpublishedChanges:
        isBuilderData(row.draftContent) &&
        !sameJson(row.draftContent, row.content),
      entryCount:
        (usage.find(u => u.templateId === row.id)?.total ?? 0) +
        (row.isDefault ? unassigned : 0),
      updatedAt: row.updatedAt ?? row.createdAt,
    }));
  },

  /** Name and id only, for pickers. */
  options: async (collectionId: string) => {
    const siteId = await adminSiteId();
    return db
      .select({
        id: collectionTemplates.id,
        name: collectionTemplates.name,
        isDefault: collectionTemplates.isDefault,
      })
      .from(collectionTemplates)
      .where(
        and(
          eq(collectionTemplates.collectionId, collectionId),
          eq(collectionTemplates.siteId, siteId)
        )
      )
      .orderBy(desc(collectionTemplates.isDefault), asc(collectionTemplates.name));
  },

  /** Draft and live layouts for the entry template builder. */
  getForEditor: async (id: string) => {
    const row = await getRowOrThrow(id);
    return {
      id: row.id,
      collectionId: row.collectionId,
      name: row.name,
      isDefault: row.isDefault,
      draft: editableContent(row),
      live: resolvePostTemplate(row.content),
      isPublished: isBuilderData(row.content),
      hasUnpublishedChanges:
        isBuilderData(row.draftContent) &&
        !sameJson(row.draftContent, row.content),
    };
  },

  create: async (
    input: {
      collectionId: string;
      name: string;
      description?: string | null;
      fromId?: string | null;
    },
    access: UserAccess
  ) => {
    await assertCanManage(access);
    const siteId = await adminSiteId();

    const [existingCount] = await db
      .select({ total: count() })
      .from(collectionTemplates)
      .where(
        and(
          eq(collectionTemplates.collectionId, input.collectionId),
          eq(collectionTemplates.siteId, siteId)
        )
      );

    const isFirst = (existingCount?.total ?? 0) === 0;

    const source = input.fromId
      ? await getRowOrThrow(input.fromId)
      : await getDefaultRow(input.collectionId, siteId);
    const content = source ? editableContent(source) : defaultPostTemplate();

    const [row] = await db
      .insert(collectionTemplates)
      .values({
        siteId,
        collectionId: input.collectionId,
        name: input.name,
        description: input.description || null,
        draftContent: content,
        content: isFirst ? content : null,
        isDefault: isFirst,
        createdBy: access.userId,
      })
      .returning();

    await audit(
      access,
      'create',
      row,
      source ? `Started from ${source.name}` : undefined
    );
    return row;
  },

  duplicate: async ({ id }: { id: string }, access: UserAccess) => {
    const source = await getRowOrThrow(id);
    return collectionTemplatesService.create(
      {
        collectionId: source.collectionId,
        name: `${source.name} (Copy)`,
        description: source.description,
        fromId: id,
      },
      access
    );
  },

  update: async (
    input: { id: string; name: string; description?: string | null },
    access: UserAccess
  ) => {
    await assertCanManage(access);
    const siteId = await adminSiteId();
    const [row] = await db
      .update(collectionTemplates)
      .set({
        name: input.name,
        description: input.description || null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(collectionTemplates.id, input.id),
          eq(collectionTemplates.siteId, siteId)
        )
      )
      .returning();
    if (!row) throw new NotFoundException('Template not found');
    await audit(access, 'update', row);
    return row;
  },

  saveDraft: async (
    { id, content }: { id: string; content: unknown },
    access: UserAccess
  ) => {
    await assertCanManage(access);
    if (!isBuilderData(content)) {
      throw new ApplicationException('The template layout is not valid.');
    }
    const siteId = await adminSiteId();
    const [row] = await db
      .update(collectionTemplates)
      .set({ draftContent: content, updatedAt: new Date() })
      .where(
        and(
          eq(collectionTemplates.id, id),
          eq(collectionTemplates.siteId, siteId)
        )
      )
      .returning({ id: collectionTemplates.id });
    if (!row) throw new NotFoundException('Template not found');
    return { savedAt: new Date().toISOString() };
  },

  publish: async ({ id }: { id: string }, access: UserAccess) => {
    await assertCanManage(access);
    const row = await getRowOrThrow(id);
    const content = editableContent(row);
    await db
      .update(collectionTemplates)
      .set({ content, draftContent: content, updatedAt: new Date() })
      .where(eq(collectionTemplates.id, id));
    await audit(access, 'publish', row);
    revalidatePublicSite();
    return { publishedAt: new Date().toISOString() };
  },

  setDefault: async ({ id }: { id: string }, access: UserAccess) => {
    await assertCanManage(access);
    const row = await getRowOrThrow(id);
    if (row.isDefault) return row;

    if (!isBuilderData(row.content)) {
      throw new ApplicationException(
        'Publish this template before making it the default.'
      );
    }

    await db.transaction(async tx => {
      await tx
        .update(collectionTemplates)
        .set({ isDefault: false })
        .where(
          and(
            eq(collectionTemplates.collectionId, row.collectionId),
            eq(collectionTemplates.siteId, row.siteId),
            eq(collectionTemplates.isDefault, true)
          )
        );
      await tx
        .update(collectionTemplates)
        .set({ isDefault: true, updatedAt: new Date() })
        .where(eq(collectionTemplates.id, id));
    });
    await audit(access, 'update', row, 'Set as default');
    revalidatePublicSite();
    return row;
  },

  delete: async ({ id }: { id: string }, access: UserAccess) => {
    await assertCanManage(access);
    const row = await getRowOrThrow(id);

    if (row.isDefault) {
      throw new ApplicationException(
        'The default template cannot be deleted. Make another template the default first.'
      );
    }

    await db.delete(collectionTemplates).where(eq(collectionTemplates.id, id));
    await audit(access, 'delete', row);
    revalidatePublicSite();
    return row;
  },

  /**
   * Resolves the layout to render for a collection entry.
   * Order of precedence:
   * 1. custom canvas (when layout = 'custom' and canvas is valid builder data)
   * 2. entry's assigned templateId
   * 3. post type default template (collectionTemplates where isDefault = true)
   * 4. legacy templatePageId page (from collections.template_page_id)
   * 5. built-in default template (defaultPostTemplate)
   */
  layoutForEntry: async (entry: {
    id?: string;
    layout?: string | null;
    canvas?: unknown;
    draftCanvas?: unknown;
    templateId?: string | null;
    collectionId: string;
    siteId?: string;
  }): Promise<BuilderData> => {
    // 1. Custom canvas
    if (entry.layout === 'custom') {
      if (isBuilderData(entry.canvas) && entry.canvas.content.length > 0) {
        return entry.canvas as BuilderData;
      }
      if (isBuilderData(entry.draftCanvas) && entry.draftCanvas.content.length > 0) {
        return entry.draftCanvas as BuilderData;
      }
    }

    let siteId = entry.siteId;
    if (!siteId) {
      try {
        siteId = await adminSiteId();
      } catch {
        siteId = 'default';
      }
    }

    try {
      // 2. Assigned templateId
      if (entry.templateId) {
        const [assigned] = await db
          .select({
            content: collectionTemplates.content,
            draftContent: collectionTemplates.draftContent,
          })
          .from(collectionTemplates)
          .where(
            and(
              eq(collectionTemplates.id, entry.templateId),
              eq(collectionTemplates.siteId, siteId)
            )
          )
          .limit(1);

        if (assigned) {
          if (isBuilderData(assigned.content) && assigned.content.content.length > 0) {
            return assigned.content as BuilderData;
          }
          if (isBuilderData(assigned.draftContent) && assigned.draftContent.content.length > 0) {
            return assigned.draftContent as BuilderData;
          }
        }
      }

      // 3. Post type default template
      const [defaultTemplate] = await db
        .select({
          content: collectionTemplates.content,
          draftContent: collectionTemplates.draftContent,
        })
        .from(collectionTemplates)
        .where(
          and(
            eq(collectionTemplates.collectionId, entry.collectionId),
            eq(collectionTemplates.siteId, siteId),
            eq(collectionTemplates.isDefault, true)
          )
        )
        .limit(1);

      if (defaultTemplate) {
        if (isBuilderData(defaultTemplate.content) && defaultTemplate.content.content.length > 0) {
          return defaultTemplate.content as BuilderData;
        }
        if (isBuilderData(defaultTemplate.draftContent) && defaultTemplate.draftContent.content.length > 0) {
          return defaultTemplate.draftContent as BuilderData;
        }
      }

      // 4. Legacy templatePageId page fallback
      const [collection] = await db
        .select({ templatePageId: collections.templatePageId })
        .from(collections)
        .where(
          and(
            eq(collections.id, entry.collectionId),
            eq(collections.siteId, siteId)
          )
        )
        .limit(1);

      if (collection?.templatePageId) {
        const contents = await db
          .select({
            kind: pageContents.kind,
            content: pageContents.content,
          })
          .from(pageContents)
          .where(eq(pageContents.pageId, collection.templatePageId));

        const publishedContent = contents.find(c => c.kind === 'published')?.content;
        if (isBuilderData(publishedContent) && publishedContent.content.length > 0) {
          return publishedContent as BuilderData;
        }
        const draftContent = contents.find(c => c.kind === 'draft')?.content;
        if (isBuilderData(draftContent) && draftContent.content.length > 0) {
          return draftContent as BuilderData;
        }
      }
    } catch {
      // DB offline or sandboxed test run - fall back to built-in default
    }

    // 5. Built-in default template
    return defaultPostTemplate();
  },
};
