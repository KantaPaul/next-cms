'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { PAGES } from '@/config/pages';
import { PERMISSIONS } from '@/config/permissions';
import { permissionProcedure } from '@/server/procedures/permission.procedure';
import { apiKeysService } from '@/server/services/api-keys.service';

export const createApiKey = permissionProcedure(PERMISSIONS.API_MANAGE)
  .input(
    z.object({ name: z.string().trim().min(1, 'Name is required').max(100) })
  )
  .action(async ({ input, ctx }) => {
    const created = await apiKeysService.create(input.name, ctx.user.userId);
    revalidatePath(PAGES.DASHBOARD.API);
    return created;
  });

export const revokeApiKey = permissionProcedure(PERMISSIONS.API_MANAGE)
  .input(z.object({ id: z.string().min(1) }))
  .action(async ({ input, ctx }) => {
    const row = await apiKeysService.revoke(input.id, ctx.user.userId);
    revalidatePath(PAGES.DASHBOARD.API);
    return row;
  });
