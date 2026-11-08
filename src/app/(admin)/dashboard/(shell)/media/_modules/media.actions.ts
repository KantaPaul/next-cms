'use server';
import { revalidatePath } from 'next/cache';
import { mediaService } from '@/app/(admin)/dashboard/(shell)/media/_modules/media.service';
import { PAGES } from '@/config/pages';
import { accessProcedure } from '@/server/procedures/permission.procedure';
import { listMediaSchema, updateMediaSchema } from './media.schemas';
import { idSchema } from '@/schemas/shared';

export const listMedia = accessProcedure
  .input(listMediaSchema)
  .action(async ({ input }) => {
    const [result, folders] = await Promise.all([
      mediaService.list(input),
      mediaService.folders(),
    ]);
    return { ...result, folders };
  });

export const updateMedia = accessProcedure
  .input(updateMediaSchema)
  .action(async ({ input, ctx }) => {
    const row = await mediaService.update(input, ctx.access);
    revalidatePath(PAGES.DASHBOARD.MEDIA);
    return row;
  });

export const deleteMedia = accessProcedure
  .input(idSchema)
  .action(async ({ input, ctx }) => {
    const row = await mediaService.remove(input, ctx.access);
    revalidatePath(PAGES.DASHBOARD.MEDIA);
    return row;
  });
