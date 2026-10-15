'use server';
import { revalidatePath } from 'next/cache';
import { PAGES } from '@/config/pages';
import { PERMISSIONS } from '@/config/permissions';
import { permissionProcedure } from '@/server/procedures/permission.procedure';
import { taxonomyService } from './taxonomy.service';
import { categorySchema, deleteSchema, tagSchema } from './taxonomy.validation';

const manage = permissionProcedure(PERMISSIONS.SETTINGS_MANAGE);

export const saveCategory = manage.input(categorySchema).action(async ({ input, ctx }) => {
  const row = await taxonomyService.saveCategory(input, ctx.user.userId);
  revalidatePath(PAGES.DASHBOARD.TAXONOMY);
  return row;
});

export const deleteCategory = manage.input(deleteSchema).action(async ({ input, ctx }) => {
  const row = await taxonomyService.deleteCategory(input.id, ctx.user.userId);
  revalidatePath(PAGES.DASHBOARD.TAXONOMY);
  return row;
});

export const saveTag = manage.input(tagSchema).action(async ({ input, ctx }) => {
  const row = await taxonomyService.saveTag(input, ctx.user.userId);
  revalidatePath(PAGES.DASHBOARD.TAXONOMY);
  return row;
});

export const deleteTag = manage.input(deleteSchema).action(async ({ input, ctx }) => {
  const row = await taxonomyService.deleteTag(input.id, ctx.user.userId);
  revalidatePath(PAGES.DASHBOARD.TAXONOMY);
  return row;
});
