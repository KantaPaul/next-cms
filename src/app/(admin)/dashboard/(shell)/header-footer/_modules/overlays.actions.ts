'use server';

import { accessProcedure } from '@/server/procedures/permission.procedure';
import { toggleOverlayEnabledSchema } from './overlays.schemas';
import { overlayAdminService } from './overlays.service';

export const listOverlayOptions = accessProcedure.query(async () => {
  return overlayAdminService.listOptions();
});

export const toggleOverlayEnabled = accessProcedure
  .input(toggleOverlayEnabledSchema)
  .action(async ({ ctx, input }) => {
    return overlayAdminService.toggleOverlayEnabled(ctx.access, input);
  });
