import { z } from 'zod';
import { COMMENT_STATUSES } from '@/db/schemas/operations.schema';

export const commentIdsSchema = z
  .array(z.string().min(1).max(100))
  .min(1)
  .max(200);

export const setCommentStatusSchema = z.object({
  ids: commentIdsSchema,
  status: z.enum(COMMENT_STATUSES),
});

export const deleteCommentsForeverSchema = z.object({ ids: commentIdsSchema });

export const replyToCommentSchema = z.object({
  parentId: z.string().min(1).max(100),
  body: z.string().trim().min(2, 'Write a reply first.').max(3000),
});
