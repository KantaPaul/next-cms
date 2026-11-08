'use server';
import { revalidatePath } from 'next/cache';
import { PAGES } from '@/config/pages';
import { PERMISSIONS } from '@/config/permissions';
import { permissionProcedure } from '@/server/procedures/permission.procedure';
import { menusService } from './menus.service';
import {
  saveMenuSchema,
  copyMenuSchema,
  saveMenuItemsSchema,
} from './menus.schemas';
import { idSchema } from '@/schemas/shared';

const manage = permissionProcedure(PERMISSIONS.SETTINGS_MANAGE);

export const getMenu = manage
  .input(idSchema)
  .action(async ({ input }) => menusService.getWithItems(input.id));

export const saveMenu = manage
  .input(saveMenuSchema)
  .action(async ({ input, ctx }) => {
    const row = await menusService.saveMenu(input, ctx.user.userId);
    revalidatePath(PAGES.DASHBOARD.MENUS);
    return row;
  });

export const deleteMenu = manage
  .input(idSchema)
  .action(async ({ input, ctx }) => {
    const row = await menusService.deleteMenu(input.id, ctx.user.userId);
    revalidatePath(PAGES.DASHBOARD.MENUS);
    return row;
  });

export const copyMenu = manage
  .input(copyMenuSchema)
  .action(async ({ input, ctx }) => {
    const row = await menusService.copyToLocale(
      input.id,
      input.language,
      ctx.user.userId
    );
    revalidatePath(PAGES.DASHBOARD.MENUS);
    return row;
  });

export const saveMenuItems = manage
  .input(saveMenuItemsSchema)
  .action(async ({ input, ctx }) => {
    const menu = await menusService.saveItems(
      input.menuId,
      input.items,
      ctx.user.userId
    );
    revalidatePath(PAGES.DASHBOARD.MENUS);
    return menu;
  });
