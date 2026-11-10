'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { PAGES } from '@/config/pages';
import { PERMISSIONS } from '@/config/permissions';
import { permissionProcedure } from '@/server/procedures/permission.procedure';
import { pluginsService } from '@/server/plugins/plugins.service';

export const togglePluginAction = permissionProcedure(
  PERMISSIONS.SETTINGS_MANAGE
)
  .input(
    z.object({
      pluginId: z.string().min(1),
      enabled: z.boolean(),
    })
  )
  .action(async ({ input, ctx }) => {
    const res = input.enabled
      ? await pluginsService.enable(input.pluginId, ctx.access)
      : await pluginsService.disable(input.pluginId, ctx.access);
    revalidatePath(PAGES.DASHBOARD.PLUGINS);
    revalidatePath(PAGES.DASHBOARD.PLUGIN_SETTINGS(input.pluginId));
    revalidatePath('/dashboard', 'layout');
    return res;
  });

export const updatePluginSettingsAction = permissionProcedure(
  PERMISSIONS.SETTINGS_MANAGE
)
  .input(
    z.object({
      pluginId: z.string().min(1),
      settings: z.record(z.string(), z.unknown()),
    })
  )
  .action(async ({ input, ctx }) => {
    const res = await pluginsService.updateSettings(
      input.pluginId,
      input.settings,
      ctx.access
    );
    revalidatePath(PAGES.DASHBOARD.PLUGINS);
    revalidatePath(PAGES.DASHBOARD.PLUGIN_SETTINGS(input.pluginId));
    return res;
  });

export const clearPluginErrorAction = permissionProcedure(
  PERMISSIONS.SETTINGS_MANAGE
)
  .input(z.object({ pluginId: z.string().min(1) }))
  .action(async ({ input, ctx }) => {
    const res = await pluginsService.clearError(input.pluginId, ctx.access);
    revalidatePath(PAGES.DASHBOARD.PLUGINS);
    revalidatePath(PAGES.DASHBOARD.PLUGIN_SETTINGS(input.pluginId));
    return res;
  });
