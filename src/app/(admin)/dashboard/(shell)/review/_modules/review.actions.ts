'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { PAGES } from '@/config/pages';
import { PERMISSIONS } from '@/config/permissions';
import { permissionProcedure } from '@/server/procedures/permission.procedure';
import { reviewService } from '@/server/services/review.service';

const target = z.object({
  kind: z.enum(['page', 'post']),
  id: z.string().min(1),
});

export const approveReview = permissionProcedure(PERMISSIONS.PAGES_PUBLISH)
  .input(target)
  .action(async ({ input, ctx }) => {
    const row = await reviewService.approve(input.kind, input.id, ctx.access);
    revalidatePath(PAGES.DASHBOARD.REVIEW);
    return row;
  });

export const requestReviewChanges = permissionProcedure(PERMISSIONS.PAGES_PUBLISH)
  .input(target.extend({ note: z.string().min(1) }))
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
