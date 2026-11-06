import 'server-only';
import { and, asc, eq, inArray } from 'drizzle-orm';
import { type BuilderData, isBuilderData } from '@/builder/data';
import { PERMISSIONS } from '@/config/permissions';
import { db } from '@/db';
import { collectionBlocks } from '@/db/schema';
import { ApplicationException, NotFoundException } from '@/lib/utils/error';
import { revalidatePublicSite } from '@/lib/utils/revalidate-site';
import {
  accessService,
  type UserAccess,
} from '@/server/services/access.service';
import { auditService } from '@/server/services/audit.service';
import { adminSiteId } from '@/server/services/site-context';

type BlockRow = typeof collectionBlocks.$inferSelect;

const sameJson = (a: unknown, b: unknown) =>
  JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

const assertCanManage = (access: UserAccess) =>
  accessService.assertPermission(access.userId, PERMISSIONS.PAGES_PUBLISH);

async function getRowOrThrow(id: string) {
  let siteId: string | null = null;
  try {
    siteId = await adminSiteId();
  } catch {
    siteId = null;
  }
  if (siteId) {
    const [row] = await db
      .select()
      .from(collectionBlocks)
      .where(
        and(eq(collectionBlocks.id, id), eq(collectionBlocks.siteId, siteId))
      )
      .limit(1);
    if (row) return row;
  }
  const [row] = await db
    .select()
    .from(collectionBlocks)
    .where(eq(collectionBlocks.id, id))
    .limit(1);
  if (!row) throw new NotFoundException('Block not found');
  return row;
}

const editableContent = (
  row?: Pick<BlockRow, 'content' | 'draftContent'>
): BuilderData =>
  isBuilderData(row?.draftContent)
    ? (row.draftContent as BuilderData)
    : isBuilderData(row?.content)
      ? (row.content as BuilderData)
      : { root: { props: {} }, content: [], zones: {} };

const publishedContent = (row?: Pick<BlockRow, 'content'>): BuilderData | null =>
  isBuilderData(row?.content) ? (row.content as BuilderData) : null;

const audit = (
  access: UserAccess,
  action: 'create' | 'update' | 'publish' | 'delete',
  row: Pick<BlockRow, 'id' | 'name'>,
  details?: string
) =>
  auditService.log({
    actorId: access.userId,
    action,
    targetType: 'template',
    targetId: row.id,
    targetName: `Collection block: ${row.name}`,
    details,
  });

export const collectionBlocksService = {
  listByCollection: async (collectionId: string) => {
    let siteId: string | null = null;
    try {
      siteId = await adminSiteId();
    } catch {
      siteId = null;
    }
    const where = siteId
      ? and(
          eq(collectionBlocks.collectionId, collectionId),
          eq(collectionBlocks.siteId, siteId)
        )
      : eq(collectionBlocks.collectionId, collectionId);
    const rows = await db
      .select()
      .from(collectionBlocks)
      .where(where)
      .orderBy(asc(collectionBlocks.name));

    return rows.map(row => ({
      id: row.id,
      collectionId: row.collectionId,
      name: row.name,
      description: row.description,
      isPublished: isBuilderData(row.content),
      hasUnpublishedChanges:
        isBuilderData(row.draftContent) &&
        !sameJson(row.draftContent, row.content),
      updatedAt: row.updatedAt ?? row.createdAt,
    }));
  },

  options: async (collectionId: string) => {
    let siteId: string | null = null;
    try {
      siteId = await adminSiteId();
    } catch {
      siteId = null;
    }
    const where = siteId
      ? and(
          eq(collectionBlocks.collectionId, collectionId),
          eq(collectionBlocks.siteId, siteId)
        )
      : eq(collectionBlocks.collectionId, collectionId);
    return db
      .select({ id: collectionBlocks.id, name: collectionBlocks.name })
      .from(collectionBlocks)
      .where(where)
      .orderBy(asc(collectionBlocks.name));
  },

  getForEditor: async (id: string) => {
    const row = await getRowOrThrow(id);
    return {
      id: row.id,
      collectionId: row.collectionId,
      name: row.name,
      description: row.description,
      draft: editableContent(row),
      live: publishedContent(row) ?? editableContent(row),
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

    const source = input.fromId ? await getRowOrThrow(input.fromId) : null;
    const content = source ? editableContent(source) : editableContent();

    const [row] = await db
      .insert(collectionBlocks)
      .values({
        siteId,
        collectionId: input.collectionId,
        name: input.name,
        description: input.description || null,
        draftContent: content,
        content: null,
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
    return collectionBlocksService.create(
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
      .update(collectionBlocks)
      .set({
        name: input.name,
        description: input.description || null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(collectionBlocks.id, input.id),
          eq(collectionBlocks.siteId, siteId)
        )
      )
      .returning();
    if (!row) throw new NotFoundException('Block not found');
    await audit(access, 'update', row);
    return row;
  },

  saveDraft: async (
    { id, content }: { id: string; content: unknown },
    access: UserAccess
  ) => {
    await assertCanManage(access);
    if (!isBuilderData(content)) {
      throw new ApplicationException('The block layout is not valid.');
    }
    const siteId = await adminSiteId();
    const [row] = await db
      .update(collectionBlocks)
      .set({ draftContent: content, updatedAt: new Date() })
      .where(
        and(
          eq(collectionBlocks.id, id),
          eq(collectionBlocks.siteId, siteId)
        )
      )
      .returning({ id: collectionBlocks.id });
    if (!row) throw new NotFoundException('Block not found');
    return { savedAt: new Date().toISOString() };
  },

  publish: async ({ id }: { id: string }, access: UserAccess) => {
    await assertCanManage(access);
    const row = await getRowOrThrow(id);
    const content = editableContent(row);
    await db
      .update(collectionBlocks)
      .set({
        content,
        draftContent: content,
        publishedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(collectionBlocks.id, id));
    await audit(access, 'publish', row);
    revalidatePublicSite();
    return { publishedAt: new Date().toISOString() };
  },

  delete: async ({ id }: { id: string }, access: UserAccess) => {
    await assertCanManage(access);
    const row = await getRowOrThrow(id);
    await db.delete(collectionBlocks).where(eq(collectionBlocks.id, id));
    await audit(access, 'delete', row);
    revalidatePublicSite();
    return row;
  },

  /** Published content for block refs, keyed for loader batching. */
  getPublishedContent: async (
    ids: string[],
    options?: { draft?: boolean; siteId?: string }
  ) => {
    if (!ids.length) return {} as Record<string, BuilderData | null>;
    const siteId = options?.siteId ?? (await adminSiteId().catch(() => 'default'));
    const rows = await db
      .select({
        id: collectionBlocks.id,
        collectionId: collectionBlocks.collectionId,
        name: collectionBlocks.name,
        content: collectionBlocks.content,
        draftContent: collectionBlocks.draftContent,
      })
      .from(collectionBlocks)
      .where(
        and(eq(collectionBlocks.siteId, siteId), inArray(collectionBlocks.id, ids))
      );

    return Object.fromEntries(
      rows
        .map(row => [
          row.id,
          {
            collectionId: row.collectionId,
            name: row.name,
            content:
              options?.draft && isBuilderData(row.draftContent)
                ? (row.draftContent as BuilderData)
                : publishedContent(row),
          },
        ])
    ) as Record<
      string,
      { collectionId: string; name: string; content: BuilderData | null } | null
    >;
  },
};
