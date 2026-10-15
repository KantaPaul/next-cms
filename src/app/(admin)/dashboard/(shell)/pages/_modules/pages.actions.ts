'use server';
import { revalidatePath } from 'next/cache';
import { PAGES } from '@/config/pages';
import { pagesServices } from '@/app/(admin)/dashboard/(shell)/pages/_modules/pages.service';
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
  .action(async ({ input, ctx }) => pagesServices.createRevision(input, ctx.access));

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
