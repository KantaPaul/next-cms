'use server';
import { revalidatePath } from 'next/cache';
import { PAGES } from '@/config/pages';
import { PERMISSIONS } from '@/config/permissions';
import {
  createPreviewTokenSchema,
  idSchema,
} from '@/db/validations/pages.validation';
import { permissionProcedure } from '@/server/procedures/permission.procedure';
import { previewService } from '@/server/services/preview.service';

const sharePages = permissionProcedure(PERMISSIONS.PAGES_EDIT);

const revalidateTarget = (row: {
  pageId: string | null;
  postId: string | null;
}) => {
  if (row.postId) revalidatePath(PAGES.DASHBOARD.POSTS.EDIT(row.postId));
  if (row.pageId) revalidatePath(PAGES.DASHBOARD.PAGES.EDIT(row.pageId));
};

export const createPreviewToken = sharePages
  .input(createPreviewTokenSchema)
  .action(async ({ input, ctx }) => {
    const row = await previewService.create(input, ctx.access);
    revalidateTarget(row);
    return row;
  });

export const regeneratePreviewToken = sharePages
  .input(idSchema)
  .action(async ({ input }) => {
    const row = await previewService.regenerate(input);
    revalidateTarget(row);
    return row;
  });

export const revokePreviewToken = sharePages
  .input(idSchema)
  .action(async ({ input }) => {
    const row = await previewService.revoke(input);
    revalidateTarget(row);
    return row;
  });
