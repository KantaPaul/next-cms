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
import { posts, postTemplates } from '@/db/schema';
import { ApplicationException, NotFoundException } from '@/lib/utils/error';
import { revalidatePublicSite } from '@/lib/utils/revalidate-site';
import {
  accessService,
  type UserAccess,
} from '@/server/services/access.service';
import { auditService } from '@/server/services/audit.service';
import { adminSiteId } from '@/server/services/site-context';

type TemplateRow = typeof postTemplates.$inferSelect;

const sameJson = (a: unknown, b: unknown) =>
  JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

const assertCanManage = (access: UserAccess) =>
  accessService.assertPermission(access.userId, PERMISSIONS.PAGES_PUBLISH);

async function getRowOrThrow(id: string) {
  const [row] = await db
    .select()
    .from(postTemplates)
    .where(
      and(eq(postTemplates.id, id), eq(postTemplates.siteId, await adminSiteId()))
    )
    .limit(1);
  if (!row) throw new NotFoundException('Template not found');
  return row;
}

async function getDefaultRow(siteId: string) {
  const [row] = await db
    .select()
    .from(postTemplates)
    .where(
      and(eq(postTemplates.siteId, siteId), eq(postTemplates.isDefault, true))
    )
    .limit(1);
  return row;
}

/** The layout a template edits from: its draft, then its live content, then the built-in default. */
const editableContent = (
  row?: Pick<TemplateRow, 'content' | 'draftContent'>
) =>
  isBuilderData(row?.draftContent)
    ? row.draftContent
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
    targetName: `Post template: ${row.name}`,
    details,
  });

/** Live layout by template id, falling back to the default template, then the built-in layout. */
const resolveLive = cache(
  async (templateId: string | null, siteId: string): Promise<BuilderData> => {
    const rows = await db
      .select({
        id: postTemplates.id,
        content: postTemplates.content,
        isDefault: postTemplates.isDefault,
      })
      .from(postTemplates)
      .where(
        and(
          eq(postTemplates.siteId, siteId),
          templateId
            ? or(
                eq(postTemplates.id, templateId),
                eq(postTemplates.isDefault, true)
              )
            : eq(postTemplates.isDefault, true)
        )
      );
    const assigned = templateId && rows.find(r => r.id === templateId);
    if (assigned && isBuilderData(assigned.content)) return assigned.content;
    return resolvePostTemplate(rows.find(r => r.isDefault)?.content);
  }
);

export const postTemplatesService = {
  /** Every template with its publish state and how many posts render through it. */
  list: async () => {
    const [rows, usage] = await Promise.all([
      db
        .select()
        .from(postTemplates)
        .where(eq(postTemplates.siteId, await adminSiteId()))
        .orderBy(desc(postTemplates.isDefault), asc(postTemplates.name)),
      db
        .select({ templateId: posts.templateId, total: count() })
        .from(posts)
        .where(and(isNull(posts.deletedAt), eq(posts.layout, 'template')))
        .groupBy(posts.templateId),
    ]);
    const unassigned = usage.find(u => u.templateId === null)?.total ?? 0;

    return rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      isDefault: row.isDefault,
      isPublished: isBuilderData(row.content),
      hasUnpublishedChanges:
        isBuilderData(row.draftContent) &&
        !sameJson(row.draftContent, row.content),
      postCount:
        (usage.find(u => u.templateId === row.id)?.total ?? 0) +
        (row.isDefault ? unassigned : 0),
      updatedAt: row.updatedAt ?? row.createdAt,
    }));
  },

  /** Name and id only, for pickers. */
  options: async () =>
    db
      .select({
        id: postTemplates.id,
        name: postTemplates.name,
        isDefault: postTemplates.isDefault,
      })
      .from(postTemplates)
      .where(eq(postTemplates.siteId, await adminSiteId()))
      .orderBy(desc(postTemplates.isDefault), asc(postTemplates.name)),

  /** Draft and live layouts for the template builder. */
  getForEditor: async (id: string) => {
    const row = await getRowOrThrow(id);
    return {
      id: row.id,
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

  resolveForPost: (post: { templateId: string | null; siteId: string }) =>
    resolveLive(post.templateId ?? null, post.siteId),

  create: async (
    input: {
      name: string;
      description?: string | null;
      fromId?: string | null;
    },
    access: UserAccess
  ) => {
    await assertCanManage(access);
    const source = input.fromId
      ? await getRowOrThrow(input.fromId)
      : await getDefaultRow(await adminSiteId());
    const content = source ? editableContent(source) : defaultPostTemplate();

    const [row] = await db
      .insert(postTemplates)
      .values({
        siteId: await adminSiteId(),
        name: input.name,
        description: input.description || null,
        draftContent: content,
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
    return postTemplatesService.create(
      {
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
      .update(postTemplates)
      .set({
        name: input.name,
        description: input.description || null,
        updatedAt: new Date(),
      })
      .where(and(eq(postTemplates.id, input.id), eq(postTemplates.siteId, siteId)))
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
    if (!isBuilderData(content))
      throw new ApplicationException('The template layout is not valid.');
    const siteId = await adminSiteId();
    const [row] = await db
      .update(postTemplates)
      .set({ draftContent: content, updatedAt: new Date() })
      .where(and(eq(postTemplates.id, id), eq(postTemplates.siteId, siteId)))
      .returning({ id: postTemplates.id });
    if (!row) throw new NotFoundException('Template not found');
    return { savedAt: new Date().toISOString() };
  },

  publish: async ({ id }: { id: string }, access: UserAccess) => {
    await assertCanManage(access);
    const row = await getRowOrThrow(id);
    const content = editableContent(row);
    await db
      .update(postTemplates)
      .set({ content, draftContent: content, updatedAt: new Date() })
      .where(eq(postTemplates.id, id));
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
        .update(postTemplates)
        .set({ isDefault: false })
        .where(
          and(
            eq(postTemplates.siteId, row.siteId),
            eq(postTemplates.isDefault, true)
          )
        );
      await tx
        .update(postTemplates)
        .set({ isDefault: true, updatedAt: new Date() })
        .where(eq(postTemplates.id, id));
    });
    await audit(access, 'update', row, 'Set as default');
    revalidatePublicSite();
    return row;
  },

  /** Posts that used the template fall back to the default one. */
  delete: async ({ id }: { id: string }, access: UserAccess) => {
    await assertCanManage(access);
    const row = await getRowOrThrow(id);

    if (row.isDefault) {
      throw new ApplicationException(
        'The default template cannot be deleted. Make another template the default first.'
      );
    }

    await db.delete(postTemplates).where(eq(postTemplates.id, id));
    await audit(access, 'delete', row);
    revalidatePublicSite();
    return row;
  },
};

export type PostTemplateListItem = Awaited<
  ReturnType<typeof postTemplatesService.list>
>[number];
export type PostTemplateOption = Awaited<
  ReturnType<typeof postTemplatesService.options>
>[number];
