'use server';

import { revalidatePath } from 'next/cache';
import { PAGES } from '@/config/pages';
import { PERMISSIONS } from '@/config/permissions';
import { permissionProcedure } from '@/server/procedures/permission.procedure';
import { reviewService } from '@/server/services/review.service';
import { targetSchema, targetWithNoteSchema } from './review.schemas';

export const approveReview = permissionProcedure(PERMISSIONS.PAGES_PUBLISH)
  .input(targetSchema)
  .action(async ({ input, ctx }) => {
    const row = await reviewService.approve(input.kind, input.id, ctx.access);
    revalidatePath(PAGES.DASHBOARD.REVIEW);
    return row;
  });

export const requestReviewChanges = permissionProcedure(
  PERMISSIONS.PAGES_PUBLISH
)
  .input(targetWithNoteSchema)
  .action(async ({ input, ctx }) => {
    const row = await reviewService.requestChanges(
      input.kind,
      input.id,
      input.note,
      ctx.access
    );
    revalidatePath(PAGES.DASHBOARD.REVIEW);
    return row;
  });
