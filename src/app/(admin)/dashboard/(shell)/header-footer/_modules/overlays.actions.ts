'use server';

import { accessProcedure } from '@/server/procedures/permission.procedure';
import { toggleOverlayEnabledSchema } from './overlays.schemas';
import { overlayAdminService } from './overlays.service';

export const toggleOverlayEnabled = accessProcedure
  .input(toggleOverlayEnabledSchema)
  .action(async ({ ctx, input }) => {
    return overlayAdminService.toggleOverlayEnabled(ctx.access, input);
  });
