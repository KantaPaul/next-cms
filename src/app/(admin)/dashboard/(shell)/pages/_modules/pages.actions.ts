'use server';
import { revalidatePath } from 'next/cache';
import { pagesServices } from '@/app/(admin)/dashboard/(shell)/pages/_modules/pages.service';
import { PAGES } from '@/config/pages';
import {
  createPagesSchema,
  createRevisionSchema,
  createTranslationSchema,
  idSchema,
  restoreRevisionSchema,
  saveDraftSchema,
  switchEditorSchema,
  updatePagesSchema,
} from '@/db/validations/pages.validation';
import { accessProcedure } from '@/server/procedures/permission.procedure';
import { type DocumentPatch, isBuilderDocument } from '@nextcms/builder-core';
import { z } from 'zod';

const revalidateAdmin = (id?: string) => {
  revalidatePath(PAGES.DASHBOARD.PAGES.INDEX);
  if (id) revalidatePath(PAGES.DASHBOARD.PAGES.EDIT(id));
};

export const createPage = accessProcedure
  .input(createPagesSchema)
  .action(async ({ input, ctx }) => {
    const created = await pagesServices.create(input, ctx.access);
    revalidateAdmin();
    return created;
  });

export const updatePage = accessProcedure
  .input(updatePagesSchema)
  .action(async ({ input, ctx }) => {
    const updated = await pagesServices.update(input, ctx.access);
    revalidateAdmin(updated.id);
    return updated;
  });

export const saveDraft = accessProcedure
  .input(saveDraftSchema)
  .action(async ({ input, ctx }) => pagesServices.saveDraft(input, ctx.access));

/** New editor saves (R738, R739): a patch or whole document, checked against `baseVersion`. */
export const saveEditorDraft = accessProcedure
  .input(
    z.object({
      id: z.string().min(1),
      baseVersion: z.number().int().min(0),
      patch: z
        .object({
          root: z.object({ props: z.record(z.string(), z.unknown()) }).optional(),
          rootSlot: z.array(z.string()).optional(),
          upsert: z.record(z.string(), z.unknown()),
          remove: z.array(z.string()),
        })
        .optional(),
      document: z.unknown().optional(),
    })
  )
  .action(async ({ input, ctx }) =>
    pagesServices.saveEditorDraft(
      {
        id: input.id,
        baseVersion: input.baseVersion,
        patch: input.patch as DocumentPatch | undefined,
        document: isBuilderDocument(input.document) ? input.document : undefined,
      },
      ctx.access
    )
  );

export const switchEditor = accessProcedure
  .input(switchEditorSchema)
  .action(async ({ input, ctx }) => {
    const page = await pagesServices.switchEditor(input, ctx.access);
    revalidateAdmin(page.id);
    return page;
  });

export const publishPage = accessProcedure
  .input(idSchema)
  .action(async ({ input, ctx }) => {
    const page = await pagesServices.publish(input, ctx.access);
    revalidateAdmin(page.id);
    return page;
  });

export const unpublishPage = accessProcedure
  .input(idSchema)
  .action(async ({ input, ctx }) => {
    const page = await pagesServices.unpublish(input, ctx.access);
    revalidateAdmin(page.id);
    return page;
  });

export const duplicatePage = accessProcedure
  .input(idSchema)
  .action(async ({ input, ctx }) => {
    const page = await pagesServices.duplicate(input, ctx.access);
    revalidateAdmin();
    return page;
  });

export const deletePage = accessProcedure
  .input(idSchema)
  .action(async ({ input, ctx }) => {
    const page = await pagesServices.softDelete(input, ctx.access);
    revalidateAdmin();
    return page;
  });

export const listRevisions = accessProcedure
  .input(idSchema)
  .action(async ({ input }) => pagesServices.listRevisions(input));

export const getRevision = accessProcedure
  .input(restoreRevisionSchema)
  .action(async ({ input }) => pagesServices.getRevision(input));

export const createRevision = accessProcedure
  .input(createRevisionSchema)
  .action(async ({ input, ctx }) =>
    pagesServices.createRevision(input, ctx.access)
  );

export const restoreRevision = accessProcedure
  .input(restoreRevisionSchema)
  .action(async ({ input, ctx }) => {
    const page = await pagesServices.restoreRevision(input, ctx.access);
    revalidateAdmin(page.id);
    return page;
  });

export const createTranslation = accessProcedure
  .input(createTranslationSchema)
  .action(async ({ input, ctx }) => {
    const page = await pagesServices.createTranslation(input, ctx.access);
    revalidateAdmin();
    return page;
  });
