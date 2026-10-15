import type { PermissionKey } from '@/config/permissions';
import { accessService } from '@/server/services/access.service';
import { protectedProcedure } from './protected.procedure';

export const permissionProcedure = (key: PermissionKey) =>
  protectedProcedure.use(async ({ ctx }) => {
    const access = await accessService.assertPermission(ctx.user.userId, key);
    return { user: ctx.user, access };
  });

export const accessProcedure = protectedProcedure.use(async ({ ctx }) => {
  const access = await accessService.getUserAccess(ctx.user.userId);
  return { user: ctx.user, access };
});
