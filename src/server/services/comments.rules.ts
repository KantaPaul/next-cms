/**
 * Pure rules for visitor comments (no DB), shared by the service and tests.
 */
import { z } from 'zod';

export const COMMENT_RATE_LIMIT = 5;
export const COMMENT_RATE_WINDOW_MS = 10 * 60_000;
export const COMMENT_MAX_LENGTH = 3000;

export const commentInputSchema = z.object({
  postId: z.string().trim().min(1).max(100),
  parentId: z.string().trim().max(100).optional().transform(v => v || undefined),
  authorName: z.string().trim().min(1, 'Add your name.').max(80),
  authorEmail: z.string().trim().email('Add a valid email.').max(200),
  authorUrl: z
    .string()
    .trim()
    .max(300)
    .optional()
    .transform(v => v || undefined)
    .refine(v => !v || /^https?:\/\/[^\s"'<>]+$/i.test(v), 'Website must start with http:// or https://'),
  body: z
    .string()
    .trim()
    .min(2, 'Write a comment first.')
    .max(COMMENT_MAX_LENGTH, `Keep comments under ${COMMENT_MAX_LENGTH} characters.`),
});

export type CommentInput = z.infer<typeof commentInputSchema>;

export type CommentTarget = {
  post: { id: string; published: boolean; allowComments: boolean } | null;
  commentsEnabled: boolean;
  parent?: { postId: string; parentId: string | null; status: string } | null;
  recentFromIp: number;
};

export type CommentDecision =
  | { ok: true; status: 'pending' | 'spam' }
  | { ok: false; status: number; error: string };

/** Decides whether a submission is accepted, and with which status. */
export function decideComment(
  input: { postId: string; parentId?: string | null },
  target: CommentTarget,
  flags: { honeypot: boolean; turnstileOk: boolean }
): CommentDecision {
  if (!target.post || !target.post.published) {
    return { ok: false, status: 404, error: 'This post is not available.' };
  }
  if (!target.commentsEnabled || !target.post.allowComments) {
    return { ok: false, status: 403, error: 'Comments are closed on this post.' };
  }
  if (input.parentId) {
    const parent = target.parent;
    if (!parent || parent.postId !== input.postId || parent.status !== 'approved') {
      return { ok: false, status: 400, error: 'That comment can’t be replied to.' };
    }
    if (parent.parentId) {
      return { ok: false, status: 400, error: 'Replies can only go one level deep.' };
    }
  }
  if (flags.honeypot) return { ok: true, status: 'spam' };
  if (!flags.turnstileOk) {
    return { ok: false, status: 400, error: 'Please complete the verification.' };
  }
  if (target.recentFromIp >= COMMENT_RATE_LIMIT) {
    return {
      ok: false,
      status: 429,
      error: 'You’re commenting too quickly. Try again in a few minutes.',
    };
  }
  return { ok: true, status: 'pending' };
}
