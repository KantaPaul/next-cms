'use server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { PAGES } from '@/config/pages';
import { PERMISSIONS } from '@/config/permissions';
import {
  accessProcedure,
  permissionProcedure,
} from '@/server/procedures/permission.procedure';
import { collectionsService } from '@/server/services/collections.service';
import { loopTemplatesService } from '@/server/services/loop-templates.service';
import {
  sourceSchema,
  createLoopTemplateSchema,
  saveLoopTemplateSchema,
  listLoopTemplateOptionsSchema,
} from './loop-templates.schemas';
import { idSchema } from '@/schemas/shared';

export const listLoopTemplateOptions = permissionProcedure(
  PERMISSIONS.PAGES_EDIT
).query(
  async ({
    params,
  }: {
    params: z.infer<typeof listLoopTemplateOptionsSchema>;
  }) => {
    const input = listLoopTemplateOptionsSchema.parse(params ?? {});
    const rows = await loopTemplatesService.list({
      sourceType: input?.sourceType,
      collectionId: input?.collectionId ?? null,
    });
    return rows.map(r => ({
      id: r.id,
      name: r.name,
      sourceType: r.sourceType,
      collectionId: r.collectionId,
      collectionName: r.collectionName,
      published: !!r.publishedAt,
    }));
  }
);

/** Custom fields of one post type, for field filters, sorts and dynamic tags. */
export const listCollectionFieldOptions = permissionProcedure(
  PERMISSIONS.PAGES_EDIT
).query(async ({ params }: { params: { collectionId: string } }) => {
  const collectionId = z.string().min(1).parse(params?.collectionId);
  const fields = await collectionsService.getFields(collectionId);
  return fields.map(f => ({
    key: f.key,
    label: f.label,
    type: f.type as string,
    choices: Array.isArray((f.config as { choices?: unknown })?.choices)
      ? ((f.config as { choices: unknown[] }).choices.map(String) as string[])
      : [],
  }));
});

export const createLoopTemplate = accessProcedure
  .input(createLoopTemplateSchema)
  .action(async ({ input, ctx }) => {
    const row = await loopTemplatesService.create(input, ctx.access);
    revalidatePath(PAGES.DASHBOARD.LOOP_TEMPLATES);
    return { id: row.id, name: row.name };
  });

export const saveLoopTemplate = accessProcedure
  .input(saveLoopTemplateSchema)
  .action(async ({ input, ctx }) => {
    // Called by the editor's autosave: no revalidatePath, which would make
    // Next re-render the open editor route. The list page is dynamic anyway.
    const row = await loopTemplatesService.update(input, ctx.access);
    return { id: row.id, updatedAt: row.updatedAt };
  });

export const publishLoopTemplate = accessProcedure
  .input(idSchema)
  .action(async ({ input, ctx }) => {
    // The service revalidates the public site; the open editor stays as is.
    const row = await loopTemplatesService.publish(input.id, ctx.access);
    return { id: row.id, publishedAt: row.publishedAt };
  });

export const duplicateLoopTemplate = accessProcedure
  .input(idSchema)
  .action(async ({ input, ctx }) => {
    const row = await loopTemplatesService.duplicate(input.id, ctx.access);
    revalidatePath(PAGES.DASHBOARD.LOOP_TEMPLATES);
    return { id: row.id };
  });

export const deleteLoopTemplate = accessProcedure
  .input(idSchema)
  .action(async ({ input, ctx }) => {
    await loopTemplatesService.delete(input.id, ctx.access);
    revalidatePath(PAGES.DASHBOARD.LOOP_TEMPLATES);
    return { id: input.id };
  });
