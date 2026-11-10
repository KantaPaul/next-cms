import 'server-only';
import {
  and,
  asc,
  count,
  desc,
  eq,
  gt,
  inArray,
  isNull,
  or,
  type SQL,
  sql,
} from 'drizzle-orm';
import { entryTitle, normalizePostTypeSupports } from '@/config/post-types';
import { PAGES } from '@/config/pages';
import { PERMISSIONS } from '@/config/permissions';
import { db } from '@/db';
import {
  collectionEntries,
  collectionFields,
  collections,
  type CommentStatus,
  commentReactions,
  comments,
  posts,
  users,
} from '@/db/schema';
import { env } from '@/env.mjs';
import { getCurrentUserAndTeamId } from '@/lib/auth';
import { revalidatePublicSite } from '@/lib/utils/revalidate-site';
import { doAction } from '@/server/plugins/hooks';
import { accessService } from '@/server/services/access.service';
import { hashIdentifier } from '@/server/services/auth-rate-limit.service';
import { verifyTurnstile } from '@/server/services/forms.service';
import { sendMail } from '@/server/services/mail';
import {
  adminSiteId,
  siteContext,
  siteSlugPrefix,
} from '@/server/services/site-context';
import { siteSettingsService } from '@/server/services/site-settings.service';
import {
  COMMENT_RATE_WINDOW_MS,
  commentInputSchema,
  decideComment,
  decideReaction,
  type ReactionValue,
} from './comments.rules';

/** What the public Comments block renders (no emails). */
export type PublicComment = {
  id: string;
  authorName: string;
  authorUrl: string | null;
  isStaff: boolean;
  body: string;
  createdAt: string;
  likes: number;
  dislikes: number;
  replies: PublicComment[];
};

const voterHashOf = (key: string) => hashIdentifier(`voter:${key}`);
const ipHashOf = (ip: string) => hashIdentifier(`comment:${ip}`);

async function reactionTotals(ids: string[]) {
  const out = new Map<string, { likes: number; dislikes: number }>();
  if (!ids.length) return out;
  const rows = await db
    .select({
      commentId: commentReactions.commentId,
      likes: sql<number>`count(*) filter (where ${commentReactions.value} = 1)`,
      dislikes: sql<number>`count(*) filter (where ${commentReactions.value} = -1)`,
    })
    .from(commentReactions)
    .where(inArray(commentReactions.commentId, ids))
    .groupBy(commentReactions.commentId);
  for (const r of rows) {
    out.set(r.commentId, { likes: Number(r.likes), dislikes: Number(r.dislikes) });
  }
  return out;
}

const publicSelect = {
  id: comments.id,
  parentId: comments.parentId,
  authorName: comments.authorName,
  authorUrl: comments.authorUrl,
  userId: comments.userId,
  body: comments.body,
  createdAt: comments.createdAt,
};

async function loadCommentsTree(
  targetWhere: SQL,
  sort: 'oldest' | 'newest' = 'oldest'
): Promise<{ items: PublicComment[]; total: number }> {
  const rows = await db
    .select(publicSelect)
    .from(comments)
    .where(
      and(
        targetWhere,
        eq(comments.status, 'approved'),
        isNull(comments.deletedAt)
      )
    )
    .orderBy(asc(comments.createdAt))
    .limit(500);
  const totals = await reactionTotals(rows.map(r => r.id));

  const toPublic = (r: (typeof rows)[number]): PublicComment => ({
    id: r.id,
    authorName: r.authorName,
    authorUrl: r.authorUrl,
    isStaff: Boolean(r.userId),
    body: r.body,
    createdAt: r.createdAt.toISOString(),
    likes: totals.get(r.id)?.likes ?? 0,
    dislikes: totals.get(r.id)?.dislikes ?? 0,
    replies: [],
  });
  const nodes = rows.map(toPublic);
  const byId = new Map(nodes.map(c => [c.id, c]));
  const top: PublicComment[] = [];
  for (const r of rows) {
    const node = byId.get(r.id)!;
    if (!r.parentId) {
      top.push(node);
    } else {
      const parent = byId.get(r.parentId);
      if (parent) parent.replies.push(node);
    }
  }
  if (sort === 'newest') top.reverse();
  const countTree = (list: PublicComment[]): number =>
    list.reduce((n, item) => n + 1 + countTree(item.replies), 0);
  return { items: top, total: countTree(top) };
}

function isEntryCommentsOpen(row: {
  entryStatus: string | null;
  entryVisibility: string | null;
  entryScheduledAt: Date | null;
  entryDeletedAt: Date | null;
  entryAllowComments: boolean | null;
  collectionStatus: string | null;
  collectionDeletedAt: Date | null;
  collectionSupports: unknown;
}) {
  const supports = normalizePostTypeSupports(row.collectionSupports);
  const published =
    row.entryStatus === 'published' &&
    row.entryVisibility === 'public' &&
    !row.entryDeletedAt &&
    !row.collectionDeletedAt &&
    row.collectionStatus === 'active' &&
    (!row.entryScheduledAt || new Date(row.entryScheduledAt) <= new Date());
  return {
    published,
    allowComments: supports.comments && row.entryAllowComments === true,
  };
}

export const commentsService = {
  /** Visitor or signed-in submission from the Comments block (POST /api/comments). */
  submit: async (
    formData: FormData,
    meta: {
      ip: string;
      userAgent: string;
      voterKey: string;
      user?: {
        id: string;
        name: string | null;
        email: string;
        website: string | null;
      } | null;
    }
  ) => {
    const read = (k: string) => {
      const v = formData.get(k);
      return typeof v === 'string' ? v : undefined;
    };
    const rawUserWebsite = meta.user?.website?.trim();
    const safeUserWebsite =
      rawUserWebsite && /^https?:\/\/[^\s"'<>]+$/i.test(rawUserWebsite)
        ? rawUserWebsite
        : undefined;
    const parsed = commentInputSchema.safeParse({
      postId: read('postId'),
      targetKind: read('targetKind'),
      parentId: read('parentId'),
      authorName: meta.user
        ? meta.user.name?.trim() || meta.user.email.split('@')[0] || 'Staff'
        : read('authorName'),
      authorEmail: meta.user ? meta.user.email : read('authorEmail'),
      authorUrl: meta.user ? safeUserWebsite : read('authorUrl'),
      body: read('body'),
    });
    if (!parsed.success) {
      return {
        ok: false as const,
        status: 400,
        error: parsed.error.issues[0]?.message ?? 'Check the form.',
      };
    }
    const input = parsed.data;
    const isEntry = input.targetKind === 'entry';
    const site = await siteContext.publicSite();
    const ipHash = ipHashOf(meta.ip);
    const since = new Date(Date.now() - COMMENT_RATE_WINDOW_MS);

    const [targetRow, parentRows, [recent], settings] = await Promise.all([
      isEntry
        ? db
            .select({
              id: collectionEntries.id,
              slug: collectionEntries.slug,
              data: collectionEntries.data,
              collectionId: collectionEntries.collectionId,
              entryStatus: collectionEntries.status,
              entryVisibility: collectionEntries.visibility,
              entryScheduledAt: collectionEntries.scheduledAt,
              entryDeletedAt: collectionEntries.deletedAt,
              entryAllowComments: collectionEntries.allowComments,
              collectionStatus: collections.status,
              collectionDeletedAt: collections.deletedAt,
              collectionSupports: collections.supports,
            })
            .from(collectionEntries)
            .innerJoin(
              collections,
              eq(collections.id, collectionEntries.collectionId)
            )
            .where(
              and(
                eq(collectionEntries.id, input.postId),
                eq(collectionEntries.siteId, site.id)
              )
            )
            .limit(1)
            .then(rows => rows[0] ?? null)
        : db
            .select({
              id: posts.id,
              slug: posts.slug,
              title: posts.title,
              language: posts.language,
              status: posts.status,
              visibility: posts.visibility,
              deletedAt: posts.deletedAt,
              allowComments: posts.allowComments,
            })
            .from(posts)
            .where(and(eq(posts.id, input.postId), eq(posts.siteId, site.id)))
            .limit(1)
            .then(rows => rows[0] ?? null),
      input.parentId
        ? db
            .select({
              postId: comments.postId,
              collectionEntryId: comments.collectionEntryId,
              parentId: comments.parentId,
              status: comments.status,
            })
            .from(comments)
            .where(
              and(eq(comments.id, input.parentId), isNull(comments.deletedAt))
            )
            .limit(1)
        : Promise.resolve([]),
      db
        .select({ n: count() })
        .from(comments)
        .where(and(eq(comments.ipHash, ipHash), gt(comments.createdAt, since))),
      siteSettingsService.getPublic(),
    ]);

    const honeypot = String(formData.get('company') ?? '').trim().length > 0;
    const [turnstileOk, autoApprove] = await Promise.all([
      honeypot
        ? Promise.resolve(true)
        : verifyTurnstile(
            String(formData.get('cf-turnstile-response') ?? '')
          ),
      meta.user
        ? accessService
            .getUserAccessForSite(meta.user.id, site.id)
            .then(access =>
              accessService.can(access, PERMISSIONS.COMMENTS_MODERATE)
            )
        : Promise.resolve(false),
    ]);

    const targetPost = targetRow
      ? 'entryStatus' in targetRow
        ? {
            id: targetRow.id,
            ...isEntryCommentsOpen(targetRow),
          }
        : {
            id: targetRow.id,
            published:
              targetRow.status === 'published' &&
              targetRow.visibility === 'public' &&
              !targetRow.deletedAt,
            allowComments: targetRow.allowComments,
          }
      : null;

    const decision = decideComment(
      input,
      {
        post: targetPost,
        commentsEnabled: settings.readingSettings?.comments !== false,
        parent: parentRows[0] ?? null,
        recentFromIp: Number(recent?.n ?? 0),
      },
      { honeypot, turnstileOk, autoApprove }
    );
    if (!decision.ok) return decision;

    const [inserted] = await db
      .insert(comments)
      .values({
        siteId: site.id,
        postId: isEntry ? null : input.postId,
        collectionEntryId: isEntry ? input.postId : null,
        parentId: input.parentId ?? null,
        authorName: input.authorName,
        authorEmail: input.authorEmail.toLowerCase(),
        authorUrl: input.authorUrl ?? null,
        userId: meta.user?.id ?? null,
        body: input.body,
        status: decision.status,
        ipHash,
        voterHash: voterHashOf(meta.voterKey),
        userAgent: meta.userAgent.slice(0, 300) || null,
      })
      .returning({ id: comments.id });

    await doAction('comment.created', {
      id: inserted.id,
      postId: isEntry ? null : input.postId,
      collectionEntryId: isEntry ? input.postId : null,
      parentId: input.parentId ?? null,
      authorName: input.authorName,
      status: decision.status,
      siteId: site.id,
    });

    if (decision.status === 'pending' && env.FORM_NOTIFY_TO && targetRow) {
      let targetTitle = '';
      if ('title' in targetRow) {
        targetTitle = targetRow.title;
      } else {
        const fields = await db
          .select({ key: collectionFields.key, type: collectionFields.type })
          .from(collectionFields)
          .where(eq(collectionFields.collectionId, targetRow.collectionId));
        targetTitle =
          entryTitle(targetRow.data, fields) || targetRow.slug;
      }
      try {
        await sendMail({
          to: env.FORM_NOTIFY_TO,
          subject: `New comment on “${targetTitle}”`,
          text: `${input.authorName} <${input.authorEmail}> wrote:\n\n${input.body}\n\nApprove or remove it under Dashboard → Comments.`,
        });
      } catch (err) {
        console.error('[comments] notification failed', err);
      }
    }

    if (decision.status === 'approved') {
      revalidatePublicSite(site.id);
    }

    return { ok: true as const, status: 200, commentStatus: decision.status };
  },

  /** Approved comments for one post, with their approved replies. */
  forPost: async (
    postId: string,
    sort: 'oldest' | 'newest' = 'oldest'
  ): Promise<{ items: PublicComment[]; total: number }> =>
    loadCommentsTree(eq(comments.postId, postId), sort),

  /** Approved comments for one collection entry, with their approved replies. */
  forEntry: async (
    entryId: string,
    sort: 'oldest' | 'newest' = 'oldest'
  ): Promise<{ items: PublicComment[]; total: number }> =>
    loadCommentsTree(eq(comments.collectionEntryId, entryId), sort),

  /** Approved comment count for one collection entry. */
  approvedCountForEntry: async (entryId: string): Promise<number> => {
    const [row] = await db
      .select({ n: count() })
      .from(comments)
      .where(
        and(
          eq(comments.collectionEntryId, entryId),
          eq(comments.status, 'approved'),
          isNull(comments.deletedAt)
        )
      );
    return Number(row?.n ?? 0);
  },

  /**
   * Like (1), dislike (-1) or clear (0) a comment. One reaction per visitor
   * per comment (cookie, falling back to network); never on your own comment.
   */
  react: async (
    input: { commentId: string; value: ReactionValue },
    meta: {
      ip: string;
      voterKey: string;
      userId?: string | null;
      userEmail?: string | null;
    }
  ) => {
    const voterHash = voterHashOf(meta.voterKey);
    const ipHash = ipHashOf(meta.ip);
    const site = await siteContext.publicSite();
    const [row] = await db
      .select({
        status: comments.status,
        voterHash: comments.voterHash,
        ipHash: comments.ipHash,
        userId: comments.userId,
        authorEmail: comments.authorEmail,
        deletedAt: comments.deletedAt,
        postId: comments.postId,
        collectionEntryId: comments.collectionEntryId,
        postStatus: posts.status,
        postVisibility: posts.visibility,
        postDeletedAt: posts.deletedAt,
        postAllowComments: posts.allowComments,
        entryStatus: collectionEntries.status,
        entryVisibility: collectionEntries.visibility,
        entryScheduledAt: collectionEntries.scheduledAt,
        entryDeletedAt: collectionEntries.deletedAt,
        entryAllowComments: collectionEntries.allowComments,
        collectionStatus: collections.status,
        collectionDeletedAt: collections.deletedAt,
        collectionSupports: collections.supports,
      })
      .from(comments)
      .leftJoin(posts, eq(posts.id, comments.postId))
      .leftJoin(
        collectionEntries,
        eq(collectionEntries.id, comments.collectionEntryId)
      )
      .leftJoin(
        collections,
        eq(collections.id, collectionEntries.collectionId)
      )
      .where(and(eq(comments.id, input.commentId), eq(comments.siteId, site.id)))
      .limit(1);
    const settings = await siteSettingsService.getPublic();
    let targetOpen = false;
    if (row) {
      if (row.postId) {
        targetOpen =
          row.postStatus === 'published' &&
          row.postVisibility === 'public' &&
          !row.postDeletedAt &&
          row.postAllowComments === true;
      } else if (row.collectionEntryId) {
        const state = isEntryCommentsOpen(row);
        targetOpen = state.published && state.allowComments;
      }
    }
    const decision = decideReaction(
      row && !row.deletedAt ? row : null,
      {
        voterHash,
        ipHash,
        userId: meta.userId ?? null,
        userEmail: meta.userEmail ?? null,
      },
      targetOpen && settings.readingSettings?.comments !== false
    );
    if (!decision.ok) return decision;

    // Same visitor = same cookie, or a reaction from the same network (stops
    // clearing cookies to vote again).
    const [existing] = await db
      .select({ voterHash: commentReactions.voterHash, value: commentReactions.value })
      .from(commentReactions)
      .where(
        and(
          eq(commentReactions.commentId, input.commentId),
          or(eq(commentReactions.voterHash, voterHash), eq(commentReactions.ipHash, ipHash))
        )
      )
      .limit(1);

    if (input.value === 0) {
      if (existing) {
        await db
          .delete(commentReactions)
          .where(
            and(
              eq(commentReactions.commentId, input.commentId),
              eq(commentReactions.voterHash, existing.voterHash)
            )
          );
      }
    } else if (existing) {
      await db
        .update(commentReactions)
        .set({ value: input.value, updatedAt: new Date() })
        .where(
          and(
            eq(commentReactions.commentId, input.commentId),
            eq(commentReactions.voterHash, existing.voterHash)
          )
        );
    } else {
      await db.insert(commentReactions).values({
        commentId: input.commentId,
        voterHash,
        ipHash,
        value: input.value,
      });
    }
    const totals = (await reactionTotals([input.commentId])).get(input.commentId);
    return {
      ok: true as const,
      likes: totals?.likes ?? 0,
      dislikes: totals?.dislikes ?? 0,
      mine: input.value,
    };
  },

  /** The current visitor's reactions and own comments on one post or entry (for button states). */
  visitorState: async (
    targetId: string,
    meta: {
      ip: string;
      voterKey: string | null;
      userId?: string | null;
      userEmail?: string | null;
    },
    targetKind: 'post' | 'entry' = 'post'
  ) => {
    // Without a cookie yet, only the network and signed-in user matches apply.
    const voterHash = meta.voterKey ? voterHashOf(meta.voterKey) : 'none';
    const ipHash = ipHashOf(meta.ip);
    const targetCol =
      targetKind === 'entry' ? comments.collectionEntryId : comments.postId;
    const ownMatchers = [
      eq(comments.voterHash, voterHash),
      eq(comments.ipHash, ipHash),
    ];
    if (meta.userId) ownMatchers.push(eq(comments.userId, meta.userId));
    if (meta.userEmail) {
      ownMatchers.push(eq(comments.authorEmail, meta.userEmail.toLowerCase()));
    }
    const [reactions, own] = await Promise.all([
      db
        .select({ commentId: commentReactions.commentId, value: commentReactions.value })
        .from(commentReactions)
        .innerJoin(comments, eq(comments.id, commentReactions.commentId))
        .where(
          and(
            eq(targetCol, targetId),
            or(eq(commentReactions.voterHash, voterHash), eq(commentReactions.ipHash, ipHash))
          )
        ),
      db
        .select({ id: comments.id })
        .from(comments)
        .where(and(eq(targetCol, targetId), or(...ownMatchers))),
    ]);
    return {
      reactions: Object.fromEntries(reactions.map(r => [r.commentId, r.value])),
      own: own.map(r => r.id),
    };
  },

  /* ---------- Dashboard ---------- */

  list: async (
    status: CommentStatus,
    page = 1,
    pageSize = 30,
    collectionId?: string
  ) => {
    const { userId } = await getCurrentUserAndTeamId();
    const site = await siteContext.adminSite(userId);
    const siteId = site.id;
    const siteSlug = siteSlugPrefix(site);
    const where = and(
      eq(comments.siteId, siteId),
      eq(comments.status, status),
      isNull(comments.deletedAt),
      collectionId ? eq(collectionEntries.collectionId, collectionId) : undefined
    );
    const [rawRows, [{ n }]] = await Promise.all([
      db
        .select({
          id: comments.id,
          parentId: comments.parentId,
          authorName: comments.authorName,
          authorEmail: comments.authorEmail,
          authorUrl: comments.authorUrl,
          userId: comments.userId,
          body: comments.body,
          status: comments.status,
          createdAt: comments.createdAt,
          postId: posts.id,
          postTitle: posts.title,
          postSlug: posts.slug,
          postLanguage: posts.language,
          entryId: collectionEntries.id,
          entrySlug: collectionEntries.slug,
          entryLanguage: collectionEntries.language,
          entryData: collectionEntries.data,
          collectionId: collections.id,
          collectionSlug: collections.slug,
          collectionName: collections.name,
          collectionSingularName: collections.singularName,
        })
        .from(comments)
        .leftJoin(posts, eq(posts.id, comments.postId))
        .leftJoin(
          collectionEntries,
          eq(collectionEntries.id, comments.collectionEntryId)
        )
        .leftJoin(
          collections,
          eq(collections.id, collectionEntries.collectionId)
        )
        .where(where)
        .orderBy(desc(comments.createdAt))
        .limit(pageSize)
        .offset((Math.max(page, 1) - 1) * pageSize),
      collectionId
        ? db
            .select({ n: count() })
            .from(comments)
            .innerJoin(
              collectionEntries,
              eq(collectionEntries.id, comments.collectionEntryId)
            )
            .where(where)
        : db.select({ n: count() }).from(comments).where(where),
    ]);

    const collectionIds = Array.from(
      new Set(
        rawRows
          .map(r => r.collectionId)
          .filter((id): id is string => Boolean(id))
      )
    );
    const fieldsByCollection = new Map<
      string,
      { key: string; type: string }[]
    >();
    if (collectionIds.length > 0) {
      const fieldRows = await db
        .select({
          collectionId: collectionFields.collectionId,
          key: collectionFields.key,
          type: collectionFields.type,
        })
        .from(collectionFields)
        .where(inArray(collectionFields.collectionId, collectionIds))
        .orderBy(asc(collectionFields.position));
      for (const f of fieldRows) {
        const list = fieldsByCollection.get(f.collectionId) ?? [];
        list.push({ key: f.key, type: f.type });
        fieldsByCollection.set(f.collectionId, list);
      }
    }

    const rows = rawRows.map(r => {
      if (r.postId && r.postSlug) {
        return {
          id: r.id,
          parentId: r.parentId,
          authorName: r.authorName,
          authorEmail: r.authorEmail,
          authorUrl: r.authorUrl,
          userId: r.userId,
          body: r.body,
          status: r.status,
          createdAt: r.createdAt,
          targetTitle: r.postTitle ?? r.postSlug,
          targetUrl: PAGES.SITE.post(
            r.postSlug,
            r.postLanguage ?? site.defaultLocale,
            site.defaultLocale,
            siteSlug
          ),
          targetTypeLabel: 'Blog post',
        };
      }
      const fields = r.collectionId
        ? (fieldsByCollection.get(r.collectionId) ?? [])
        : [];
      const title =
        entryTitle(r.entryData, fields) || r.entrySlug || 'Entry';
      return {
        id: r.id,
        parentId: r.parentId,
        authorName: r.authorName,
        authorEmail: r.authorEmail,
        authorUrl: r.authorUrl,
        userId: r.userId,
        body: r.body,
        status: r.status,
        createdAt: r.createdAt,
        targetTitle: title,
        targetUrl:
          r.collectionSlug && r.entrySlug
            ? PAGES.SITE.entry(
                r.collectionSlug,
                r.entrySlug,
                r.entryLanguage ?? site.defaultLocale,
                site.defaultLocale,
                siteSlug
              )
            : '#',
        targetTypeLabel:
          r.collectionSingularName || r.collectionName || 'Entry',
      };
    });

    return { rows, total: Number(n), page, pageSize };
  },

  counts: async (
    collectionId?: string
  ): Promise<Record<CommentStatus, number>> => {
    const siteId = await adminSiteId();
    const baseWhere = and(
      eq(comments.siteId, siteId),
      isNull(comments.deletedAt),
      collectionId ? eq(collectionEntries.collectionId, collectionId) : undefined
    );
    const rows = collectionId
      ? await db
          .select({ status: comments.status, n: count() })
          .from(comments)
          .innerJoin(
            collectionEntries,
            eq(collectionEntries.id, comments.collectionEntryId)
          )
          .where(baseWhere)
          .groupBy(comments.status)
      : await db
          .select({ status: comments.status, n: count() })
          .from(comments)
          .where(baseWhere)
          .groupBy(comments.status);
    const out = { pending: 0, approved: 0, spam: 0, trash: 0 };
    for (const r of rows) {
      if (r.status in out) out[r.status as CommentStatus] = Number(r.n);
    }
    return out;
  },

  pendingCount: async () => {
    try {
      const siteId = await adminSiteId();
      const [row] = await db
        .select({ n: count() })
        .from(comments)
        .where(
          and(
            eq(comments.siteId, siteId),
            eq(comments.status, 'pending'),
            isNull(comments.deletedAt)
          )
        );
      return Number(row?.n ?? 0);
    } catch {
      return 0;
    }
  },

  setStatus: async (ids: string[], status: CommentStatus) => {
    if (!ids.length) return 0;
    const siteId = await adminSiteId();
    const rows = await db
      .update(comments)
      .set({ status, updatedAt: new Date() })
      .where(and(inArray(comments.id, ids), eq(comments.siteId, siteId)))
      .returning({ id: comments.id });
    revalidatePublicSite(siteId);
    return rows.length;
  },

  /** Permanent delete, only for comments already in Trash. */
  deleteForever: async (ids: string[]) => {
    if (!ids.length) return 0;
    const siteId = await adminSiteId();
    const rows = await db
      .delete(comments)
      .where(
        and(
          inArray(comments.id, ids),
          eq(comments.siteId, siteId),
          eq(comments.status, 'trash')
        )
      )
      .returning({ id: comments.id });
    revalidatePublicSite(siteId);
    return rows.length;
  },

  /** A staff reply: approved immediately, attached to the parent comment. */
  reply: async (parentId: string, body: string, userId: string) => {
    const siteId = await adminSiteId();
    const [parent] = await db
      .select({
        id: comments.id,
        parentId: comments.parentId,
        postId: comments.postId,
        collectionEntryId: comments.collectionEntryId,
      })
      .from(comments)
      .where(and(eq(comments.id, parentId), eq(comments.siteId, siteId)))
      .limit(1);
    if (!parent) throw new Error('Comment not found');
    const [user] = await db
      .select({ name: users.name, email: users.email })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    await db.insert(comments).values({
      siteId,
      postId: parent.postId,
      collectionEntryId: parent.collectionEntryId,
      parentId: parent.id,
      authorName: user?.name || 'Staff',
      authorEmail: user?.email ?? '',
      userId,
      body: body.trim().slice(0, 3000),
      status: 'approved',
    });
    // Replying approves the comment being answered.
    await db
      .update(comments)
      .set({ status: 'approved', updatedAt: new Date() })
      .where(and(eq(comments.id, parent.id), eq(comments.status, 'pending')));
    revalidatePublicSite(siteId);
  },

  postUrl: (slug: string, language: string, defaultLocale = 'en') =>
    PAGES.SITE.post(slug, language, defaultLocale),
};

