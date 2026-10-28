import 'server-only';
import { randomBytes } from 'node:crypto';
import { and, desc, eq, isNull, sql } from 'drizzle-orm';
import { db } from '@/db';
import { pages, posts, previewTokens, users } from '@/db/schema';
import { NotFoundException } from '@/lib/utils/error';
import type { UserAccess } from '@/server/services/access.service';
import { auditService } from '@/server/services/audit.service';
import { adminSiteId } from '@/server/services/site-context';

const DEFAULT_TTL_DAYS = 7;

const newToken = () => randomBytes(24).toString('base64url');

export type PreviewTarget = { pageId: string | null; postId: string | null };

const listSelect = {
  id: previewTokens.id,
  token: previewTokens.token,
  status: previewTokens.status,
  expiresAt: previewTokens.expiresAt,
  viewCount: previewTokens.viewCount,
  lastAccessedAt: previewTokens.lastAccessedAt,
  createdAt: previewTokens.createdAt,
  createdByName: users.name,
};

const list = async (where?: ReturnType<typeof eq>) => {
  const siteId = await adminSiteId();
  return db
    .select(listSelect)
    .from(previewTokens)
    .leftJoin(users, eq(users.id, previewTokens.createdBy))
    .leftJoin(pages, eq(pages.id, previewTokens.pageId))
    .leftJoin(posts, eq(posts.id, previewTokens.postId))
    .where(
      where ??
        sql`(${pages.siteId} = ${siteId} OR ${posts.siteId} = ${siteId})`
    )
    .orderBy(desc(previewTokens.createdAt));
};

async function findTarget({
  pageId,
  postId,
}: {
  pageId?: string | null;
  postId?: string | null;
}) {
  const siteId = await adminSiteId();
  if (postId) {
    const [post] = await db
      .select({ id: posts.id, title: posts.title })
      .from(posts)
      .where(and(eq(posts.id, postId), eq(posts.siteId, siteId), isNull(posts.deletedAt)));
    if (!post) throw new NotFoundException('Post not found');
    return { ...post, type: 'post' as const };
  }

  const [page] = await db
    .select({ id: pages.id, title: pages.title })
    .from(pages)
    .where(and(eq(pages.id, pageId ?? ''), eq(pages.siteId, siteId), isNull(pages.deletedAt)));
  if (!page) throw new NotFoundException('Page not found');
  return { ...page, type: 'page' as const };
}

export const previewService = {
  listForPage: async (pageId: string) => list(eq(previewTokens.pageId, pageId)),

  listForPost: async (postId: string) => list(eq(previewTokens.postId, postId)),

  create: async (
    {
      pageId,
      postId,
      expiresInDays,
    }: {
      pageId?: string | null;
      postId?: string | null;
      expiresInDays?: number | null;
    },
    access: UserAccess
  ) => {
    const target = await findTarget({ pageId, postId });
    const days =
      expiresInDays === null ? null : (expiresInDays ?? DEFAULT_TTL_DAYS);
    const [row] = await db
      .insert(previewTokens)
      .values({
        pageId: target.type === 'page' ? target.id : null,
        postId: target.type === 'post' ? target.id : null,
        token: newToken(),
        expiresAt: days ? new Date(Date.now() + days * 86_400_000) : null,
        createdBy: access.userId,
      })
      .returning();

    await auditService.log({
      actorId: access.userId,
      action: 'create',
      targetType: target.type,
      targetId: target.id,
      targetName: target.title,
      details: 'Created preview link',
    });
    return row;
  },

  regenerate: async ({ id }: { id: string }) => {
    const [row] = await db
      .update(previewTokens)
      .set({
        token: newToken(),
        status: 'active',
        viewCount: 0,
        lastAccessedAt: null,
      })
      .where(eq(previewTokens.id, id))
      .returning();
    if (!row) throw new NotFoundException('Preview link not found');
    return row;
  },

  revoke: async ({ id }: { id: string }) => {
    const [row] = await db
      .update(previewTokens)
      .set({ status: 'revoked' })
      .where(eq(previewTokens.id, id))
      .returning();
    if (!row) throw new NotFoundException('Preview link not found');
    return row;
  },

  /** Returns the page or post for a usable token and records the visit. */
  consume: async (token: string): Promise<PreviewTarget | null> => {
    const [row] = await db
      .select({
        id: previewTokens.id,
        pageId: previewTokens.pageId,
        postId: previewTokens.postId,
        expiresAt: previewTokens.expiresAt,
        pageSiteId: pages.siteId,
        postSiteId: posts.siteId,
      })
      .from(previewTokens)
      .leftJoin(pages, eq(pages.id, previewTokens.pageId))
      .leftJoin(posts, eq(posts.id, previewTokens.postId))
      .where(
        and(eq(previewTokens.token, token), eq(previewTokens.status, 'active'))
      )
      .limit(1);

    if (!row) return null;
    if (row.expiresAt && row.expiresAt.getTime() < Date.now()) return null;
    if (row.pageId && !row.pageSiteId) return null;
    if (row.postId && !row.postSiteId) return null;

    await db
      .update(previewTokens)
      .set({
        viewCount: sql`${previewTokens.viewCount} + 1`,
        lastAccessedAt: new Date(),
      })
      .where(eq(previewTokens.id, row.id));

    return { pageId: row.pageId, postId: row.postId };
  },

  /** Validates a token without counting a view (used on every draft-mode render). */
  resolve: async (token: string): Promise<PreviewTarget | null> => {
    const [row] = await db
      .select({
        pageId: previewTokens.pageId,
        postId: previewTokens.postId,
        expiresAt: previewTokens.expiresAt,
        pageSiteId: pages.siteId,
        postSiteId: posts.siteId,
      })
      .from(previewTokens)
      .leftJoin(pages, eq(pages.id, previewTokens.pageId))
      .leftJoin(posts, eq(posts.id, previewTokens.postId))
      .where(
        and(eq(previewTokens.token, token), eq(previewTokens.status, 'active'))
      )
      .limit(1);
    if (!row || (row.expiresAt && row.expiresAt.getTime() < Date.now()))
      return null;
    if (row.pageId && !row.pageSiteId) return null;
    if (row.postId && !row.postSiteId) return null;
    return { pageId: row.pageId, postId: row.postId };
  },
};

export type PreviewTokenListItem = Awaited<
  ReturnType<typeof previewService.listForPage>
>[number];
