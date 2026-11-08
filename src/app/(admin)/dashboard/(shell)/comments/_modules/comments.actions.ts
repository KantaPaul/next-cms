'use server';

import { revalidatePath } from 'next/cache';
import { PAGES } from '@/config/pages';
import { PERMISSIONS } from '@/config/permissions';
import { permissionProcedure } from '@/server/procedures/permission.procedure';
import { commentsService } from '@/server/services/comments.service';
import {
  setCommentStatusSchema,
  deleteCommentsForeverSchema,
  replyToCommentSchema,
} from './comments.schemas';

export const setCommentStatus = permissionProcedure(
  PERMISSIONS.COMMENTS_MODERATE
)
  .input(setCommentStatusSchema)
  .action(async ({ input }) => {
    const updated = await commentsService.setStatus(input.ids, input.status);
    revalidatePath(PAGES.DASHBOARD.COMMENTS);
    return { updated };
  });

export const deleteCommentsForever = permissionProcedure(
  PERMISSIONS.COMMENTS_MODERATE
)
  .input(deleteCommentsForeverSchema)
  .action(async ({ input }) => {
    const deleted = await commentsService.deleteForever(input.ids);
    revalidatePath(PAGES.DASHBOARD.COMMENTS);
    return { deleted };
  });

export const replyToComment = permissionProcedure(PERMISSIONS.COMMENTS_MODERATE)
  .input(replyToCommentSchema)
  .action(async ({ input, ctx }) => {
    await commentsService.reply(input.parentId, input.body, ctx.user.userId);
    revalidatePath(PAGES.DASHBOARD.COMMENTS);
    return { ok: true };
  });
