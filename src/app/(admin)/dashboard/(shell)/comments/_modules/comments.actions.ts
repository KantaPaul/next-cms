'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { PAGES } from '@/config/pages';
import { PERMISSIONS } from '@/config/permissions';
import { COMMENT_STATUSES } from '@/db/schemas/operations.schema';
import { permissionProcedure } from '@/server/procedures/permission.procedure';
import { commentsService } from '@/server/services/comments.service';

const ids = z.array(z.string().min(1).max(100)).min(1).max(200);

export const setCommentStatus = permissionProcedure(
  PERMISSIONS.COMMENTS_MODERATE
)
  .input(z.object({ ids, status: z.enum(COMMENT_STATUSES) }))
  .action(async ({ input }) => {
    const updated = await commentsService.setStatus(input.ids, input.status);
    revalidatePath(PAGES.DASHBOARD.COMMENTS);
    return { updated };
  });

export const deleteCommentsForever = permissionProcedure(
  PERMISSIONS.COMMENTS_MODERATE
)
  .input(z.object({ ids }))
  .action(async ({ input }) => {
    const deleted = await commentsService.deleteForever(input.ids);
    revalidatePath(PAGES.DASHBOARD.COMMENTS);
    return { deleted };
  });

export const replyToComment = permissionProcedure(PERMISSIONS.COMMENTS_MODERATE)
  .input(
    z.object({
      parentId: z.string().min(1).max(100),
      body: z.string().trim().min(2, 'Write a reply first.').max(3000),
    })
  )
  .action(async ({ input, ctx }) => {
    await commentsService.reply(input.parentId, input.body, ctx.user.userId);
    revalidatePath(PAGES.DASHBOARD.COMMENTS);
    return { ok: true };
  });
