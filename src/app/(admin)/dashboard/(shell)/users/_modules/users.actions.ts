'use server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { PAGES } from '@/config/pages';
import { PERMISSIONS, ROLE_NAMES } from '@/config/permissions';
import { permissionProcedure } from '@/server/procedures/permission.procedure';
import { usersService } from './users.service';

export const setUserRole = permissionProcedure(PERMISSIONS.SETTINGS_MANAGE)
  .input(z.object({ userId: z.string().min(1), role: z.enum(ROLE_NAMES) }))
  .action(async ({ input, ctx }) => {
    const row = await usersService.setRole(input, ctx.user.userId);
    revalidatePath(PAGES.DASHBOARD.USERS);
    return row;
  });
