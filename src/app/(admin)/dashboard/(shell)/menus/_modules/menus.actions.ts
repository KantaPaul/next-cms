'use server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { PAGES } from '@/config/pages';
import { PERMISSIONS } from '@/config/permissions';
import { MENU_LOCATION } from '@/db/schemas/shared.schema';
import { permissionProcedure } from '@/server/procedures/permission.procedure';
import { menusService } from './menus.service';

const manage = permissionProcedure(PERMISSIONS.SETTINGS_MANAGE);

const url = z
  .string()
  .trim()
  .min(1, 'Link is required')
  .max(500)
  .refine(
    v => /^(\/|#|https?:\/\/|mailto:|tel:)/.test(v),
    'Links must start with /, #, http(s)://, mailto:, or tel:'
  );

const itemSchema = z.object({
  label: z.string().trim().min(1, 'Every item needs a label').max(100),
  url,
  target: z.enum(['_self', '_blank']),
  badge: z.string().trim().max(30).nullish(),
});

export const getMenu = manage
  .input(z.object({ id: z.string().min(1) }))
  .action(async ({ input }) => menusService.getWithItems(input.id));

export const saveMenu = manage
  .input(
    z.object({
      id: z.string().optional(),
      title: z.string().trim().min(1, 'Title is required').max(100),
      location: z.enum(MENU_LOCATION),
    })
  )
  .action(async ({ input, ctx }) => {
    const row = await menusService.saveMenu(input, ctx.user.userId);
    revalidatePath(PAGES.DASHBOARD.MENUS);
    return row;
  });

export const deleteMenu = manage
  .input(z.object({ id: z.string().min(1) }))
  .action(async ({ input, ctx }) => {
    const row = await menusService.deleteMenu(input.id, ctx.user.userId);
    revalidatePath(PAGES.DASHBOARD.MENUS);
    return row;
  });

export const saveMenuItems = manage
  .input(
    z.object({
      menuId: z.string().min(1),
      items: z
        .array(
          itemSchema.extend({
            children: z.array(itemSchema).max(50).optional(),
          })
        )
        .max(50),
    })
  )
  .action(async ({ input, ctx }) => {
    const menu = await menusService.saveItems(
      input.menuId,
      input.items,
      ctx.user.userId
    );
    revalidatePath(PAGES.DASHBOARD.MENUS);
    return menu;
  });
