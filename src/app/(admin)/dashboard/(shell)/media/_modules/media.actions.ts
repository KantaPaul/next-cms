'use server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { PAGES } from '@/config/pages';
import { accessProcedure } from '@/server/procedures/permission.procedure';
import { mediaService } from '@/app/(admin)/dashboard/(shell)/media/_modules/media.service';

const listSchema = z.object({
  search: z.string().optional(),
  folder: z.string().optional(),
  type: z.enum(['image', 'video', 'document', '']).optional(),
  page: z.number().int().min(1).optional(),
  size: z.number().int().min(1).max(100).optional(),
});

const updateSchema = z.object({
  id: z.string().min(1),
  title: z.string().trim().max(255).nullish(),
  alt: z.string().trim().max(1000).nullish(),
  folder: z.string().trim().max(60).nullish(),
});

export const listMedia = accessProcedure
  .input(listSchema)
  .action(async ({ input }) => {
    const [result, folders] = await Promise.all([mediaService.list(input), mediaService.folders()]);
    return { ...result, folders };
  });

export const updateMedia = accessProcedure
  .input(updateSchema)
  .action(async ({ input, ctx }) => {
    const row = await mediaService.update(input, ctx.access);
    revalidatePath(PAGES.DASHBOARD.MEDIA);
    return row;
  });

export const deleteMedia = accessProcedure
  .input(z.object({ id: z.string().min(1) }))
  .action(async ({ input, ctx }) => {
    const row = await mediaService.remove(input, ctx.access);
    revalidatePath(PAGES.DASHBOARD.MEDIA);
    return row;
  });
