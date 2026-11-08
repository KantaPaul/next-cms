'use server';

import { revalidatePath } from 'next/cache';
import { PAGES } from '@/config/pages';
import { PERMISSIONS } from '@/config/permissions';
import { permissionProcedure } from '@/server/procedures/permission.procedure';
import { apiKeysService } from '@/server/services/api-keys.service';
import { createApiKeySchema } from './api-keys.schemas';
import { idSchema } from '@/schemas/shared';

export const createApiKey = permissionProcedure(PERMISSIONS.API_MANAGE)
  .input(createApiKeySchema)
  .action(async ({ input, ctx }) => {
    const created = await apiKeysService.create(input.name, ctx.user.userId);
    revalidatePath(PAGES.DASHBOARD.API);
    return created;
  });

export const revokeApiKey = permissionProcedure(PERMISSIONS.API_MANAGE)
  .input(idSchema)
  .action(async ({ input, ctx }) => {
    const row = await apiKeysService.revoke(input.id, ctx.user.userId);
    revalidatePath(PAGES.DASHBOARD.API);
    return row;
  });
