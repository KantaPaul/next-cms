import 'server-only';
import { and, asc, count, desc, eq, gt, inArray, isNull, or, sql } from 'drizzle-orm';
import { db } from '@/db';
import {
  type CommentStatus,
  commentReactions,
  comments,
  posts,
  users,
} from '@/db/schema';
import { env } from '@/env.mjs';
import { PAGES } from '@/config/pages';
import { revalidatePublicSite } from '@/lib/utils/revalidate-site';
import { hashIdentifier } from '@/server/services/auth-rate-limit.service';
import { verifyTurnstile } from '@/server/services/forms.service';
import { sendMail } from '@/server/services/mail';
import { adminSiteId, siteContext } from '@/server/services/site-context';
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

export const commentsService = {
  /** Visitor submission from the Comments block (POST /api/comments). */
  submit: async (
    formData: FormData,
    meta: { ip: string; userAgent: string; voterKey: string }
  ) => {
    const read = (k: string) => {
      const v = formData.get(k);
      return typeof v === 'string' ? v : undefined;
    };
    const parsed = commentInputSchema.safeParse({
      postId: read('postId'),
      parentId: read('parentId'),
      authorName: read('authorName'),
      authorEmail: read('authorEmail'),
      authorUrl: read('authorUrl'),
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
    const site = await siteContext.publicSite();
    const ipHash = ipHashOf(meta.ip);
    const since = new Date(Date.now() - COMMENT_RATE_WINDOW_MS);

    const [[post], parentRows, [recent], settings] = await Promise.all([
      db
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
        .limit(1),
      input.parentId
        ? db
            .select({
              postId: comments.postId,
              parentId: comments.parentId,
              status: comments.status,
            })
            .from(comments)
            .where(and(eq(comments.id, input.parentId), isNull(comments.deletedAt)))
            .limit(1)
        : Promise.resolve([]),
      db
        .select({ n: count() })
        .from(comments)
        .where(and(eq(comments.ipHash, ipHash), gt(comments.createdAt, since))),
      siteSettingsService.getPublic(),
    ]);

    const honeypot = String(formData.get('company') ?? '').trim().length > 0;
    const turnstileOk = honeypot
      ? true
      : await verifyTurnstile(String(formData.get('cf-turnstile-response') ?? ''));

    const decision = decideComment(
      input,
      {
        post: post
          ? {
              id: post.id,
              published:
                post.status === 'published' &&
                post.visibility === 'public' &&
                !post.deletedAt,
              allowComments: post.allowComments,
            }
          : null,
        commentsEnabled: settings.readingSettings?.comments !== false,
        parent: parentRows[0] ?? null,
        recentFromIp: Number(recent?.n ?? 0),
      },
      { honeypot, turnstileOk }
    );
    if (!decision.ok) return decision;

    await db.insert(comments).values({
      siteId: site.id,
      postId: input.postId,
      parentId: input.parentId ?? null,
      authorName: input.authorName,
      authorEmail: input.authorEmail.toLowerCase(),
      authorUrl: input.authorUrl ?? null,
      body: input.body,
      status: decision.status,
      ipHash,
      voterHash: voterHashOf(meta.voterKey),
      userAgent: meta.userAgent.slice(0, 300) || null,
    });

    if (decision.status === 'pending' && env.FORM_NOTIFY_TO && post) {
      try {
        await sendMail({
          to: env.FORM_NOTIFY_TO,
          subject: `New comment on “${post.title}”`,
          text: `${input.authorName} <${input.authorEmail}> wrote:\n\n${input.body}\n\nApprove or remove it under Dashboard → Comments.`,
        });
      } catch (err) {
        console.error('[comments] notification failed', err);
      }
    }

    return { ok: true as const, status: 200 };
  },

  /** Approved comments for one post, with their approved replies. */
  forPost: async (
    postId: string,
    sort: 'oldest' | 'newest' = 'oldest'
  ): Promise<{ items: PublicComment[]; total: number }> => {
    const rows = await db
      .select(publicSelect)
      .from(comments)
      .where(
        and(
          eq(comments.postId, postId),
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
    const top = rows.filter(r => !r.parentId).map(toPublic);
    const byId = new Map(top.map(c => [c.id, c]));
    for (const r of rows) {
      if (r.parentId) byId.get(r.parentId)?.replies.push(toPublic(r));
    }
    if (sort === 'newest') top.reverse();
    return { items: top, total: rows.length };
  },

  /**
   * Like (1), dislike (-1) or clear (0) a comment. One reaction per visitor
   * per comment (cookie, falling back to network); never on your own comment.
   */
  react: async (
    input: { commentId: string; value: ReactionValue },
    meta: { ip: string; voterKey: string }
  ) => {
    const voterHash = voterHashOf(meta.voterKey);
    const ipHash = ipHashOf(meta.ip);
    const site = await siteContext.publicSite();
    const [row] = await db
      .select({
        status: comments.status,
        voterHash: comments.voterHash,
        ipHash: comments.ipHash,
        deletedAt: comments.deletedAt,
        postStatus: posts.status,
        postVisibility: posts.visibility,
        allowComments: posts.allowComments,
      })
      .from(comments)
      .innerJoin(posts, eq(posts.id, comments.postId))
      .where(and(eq(comments.id, input.commentId), eq(comments.siteId, site.id)))
      .limit(1);
    const settings = await siteSettingsService.getPublic();
    const decision = decideReaction(
      row && !row.deletedAt ? row : null,
      { voterHash, ipHash },
      Boolean(row) &&
        row.postStatus === 'published' &&
        row.postVisibility === 'public' &&
        row.allowComments &&
        settings.readingSettings?.comments !== false
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

  /** The current visitor's reactions and own comments on one post (for button states). */
  visitorState: async (postId: string, meta: { ip: string; voterKey: string | null }) => {
    // Without a cookie yet, only the network match applies.
    const voterHash = meta.voterKey ? voterHashOf(meta.voterKey) : 'none';
    const ipHash = ipHashOf(meta.ip);
    const [reactions, own] = await Promise.all([
      db
        .select({ commentId: commentReactions.commentId, value: commentReactions.value })
        .from(commentReactions)
        .innerJoin(comments, eq(comments.id, commentReactions.commentId))
        .where(
          and(
            eq(comments.postId, postId),
            or(eq(commentReactions.voterHash, voterHash), eq(commentReactions.ipHash, ipHash))
          )
        ),
      db
        .select({ id: comments.id })
        .from(comments)
        .where(
          and(
            eq(comments.postId, postId),
            or(eq(comments.voterHash, voterHash), eq(comments.ipHash, ipHash))
          )
        ),
    ]);
    return {
      reactions: Object.fromEntries(reactions.map(r => [r.commentId, r.value])),
      own: own.map(r => r.id),
    };
  },

  /* ---------- Dashboard ---------- */

  list: async (status: CommentStatus, page = 1, pageSize = 30) => {
    const siteId = await adminSiteId();
    const where = and(
      eq(comments.siteId, siteId),
      eq(comments.status, status),
      isNull(comments.deletedAt)
    );
    const [rows, [{ n }]] = await Promise.all([
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
        })
        .from(comments)
        .innerJoin(posts, eq(posts.id, comments.postId))
        .where(where)
        .orderBy(desc(comments.createdAt))
        .limit(pageSize)
        .offset((Math.max(page, 1) - 1) * pageSize),
      db.select({ n: count() }).from(comments).where(where),
    ]);
    return { rows, total: Number(n), page, pageSize };
  },

  counts: async (): Promise<Record<CommentStatus, number>> => {
    const siteId = await adminSiteId();
    const rows = await db
      .select({ status: comments.status, n: count() })
      .from(comments)
      .where(and(eq(comments.siteId, siteId), isNull(comments.deletedAt)))
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

  /** A staff reply: approved immediately, attached to the top-level comment. */
  reply: async (parentId: string, body: string, userId: string) => {
    const siteId = await adminSiteId();
    const [parent] = await db
      .select({
        id: comments.id,
        parentId: comments.parentId,
        postId: comments.postId,
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
      parentId: parent.parentId ?? parent.id,
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

