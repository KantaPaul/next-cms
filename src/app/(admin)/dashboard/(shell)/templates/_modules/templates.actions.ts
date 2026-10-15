'use server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { PAGES } from '@/config/pages';
import { PERMISSIONS } from '@/config/permissions';
import { EDITOR_TYPE } from '@/db/schemas/shared.schema';
import { db } from '@/db';
import { globalBlocks } from '@/db/schema';
import { asc, eq } from 'drizzle-orm';
import { accessProcedure, permissionProcedure } from '@/server/procedures/permission.procedure';
import { templatesService } from '@/app/(admin)/dashboard/(shell)/templates/_modules/templates.service';

const blockItemSchema = z.object({
  type: z.string().min(1),
  props: z.record(z.string(), z.unknown()).and(z.object({ id: z.string() })),
});

export const listGlobalBlockOptions = permissionProcedure(PERMISSIONS.PAGES_EDIT).query(async () =>
  db
    .select({ id: globalBlocks.id, name: globalBlocks.name, category: globalBlocks.category })
    .from(globalBlocks)
    .orderBy(asc(globalBlocks.name))
);

/**
 * Public read of a global block's sections. Used by the GlobalRef block's `resolveData`
 * in the editor and during public rendering; global blocks hold only published copy.
 */
export async function getGlobalBlockContent(id: string) {
  if (typeof id !== 'string' || !id) return null;
  const [row] = await db
    .select({ id: globalBlocks.id, name: globalBlocks.name, content: globalBlocks.content })
    .from(globalBlocks)
    .where(eq(globalBlocks.id, id))
    .limit(1);
  return row ?? null;
}

export const saveGlobalBlock = accessProcedure
  .input(
    z.object({
      id: z.string().optional(),
      name: z.string().trim().min(1).max(150),
      category: z.string().trim().max(50).optional(),
      content: z.array(blockItemSchema).min(1),
    })
  )
  .action(async ({ input, ctx }) => {
    const row = await templatesService.saveGlobalBlock(input as never, ctx.access);
    revalidatePath(PAGES.DASHBOARD.TEMPLATES);
    return row;
  });

export const renameGlobalBlock = accessProcedure
  .input(z.object({ id: z.string().min(1), name: z.string().trim().min(1).max(150), category: z.string().trim().max(50) }))
  .action(async ({ input, ctx }) => {
    const row = await templatesService.renameGlobalBlock(input, ctx.access);
    revalidatePath(PAGES.DASHBOARD.TEMPLATES);
    return row;
  });

export const deleteGlobalBlock = accessProcedure
  .input(z.object({ id: z.string().min(1) }))
  .action(async ({ input, ctx }) => {
    const row = await templatesService.deleteGlobalBlock(input, ctx.access);
    revalidatePath(PAGES.DASHBOARD.TEMPLATES);
    return row;
  });

export const saveTemplate = accessProcedure
  .input(
    z.object({
      name: z.string().trim().min(1).max(150),
      description: z.string().trim().max(500).nullish(),
      category: z.string().trim().max(50).optional(),
      editorType: z.enum(EDITOR_TYPE),
      content: z.unknown(),
    })
  )
  .action(async ({ input, ctx }) => {
    const row = await templatesService.saveTemplate(input, ctx.access);
    revalidatePath(PAGES.DASHBOARD.TEMPLATES);
    return row;
  });

export const deleteTemplate = accessProcedure
  .input(z.object({ id: z.string().min(1) }))
  .action(async ({ input, ctx }) => {
    const row = await templatesService.deleteTemplate(input, ctx.access);
    revalidatePath(PAGES.DASHBOARD.TEMPLATES);
    return row;
  });
