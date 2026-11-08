import { z } from 'zod';

export const commentReactionSchema = z.object({
  commentId: z.string().trim().min(1).max(100),
  value: z.union([z.literal(1), z.literal(-1), z.literal(0)]),
});
