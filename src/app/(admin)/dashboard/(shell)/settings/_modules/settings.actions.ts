'use server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { PAGES } from '@/config/pages';
import { PERMISSIONS } from '@/config/permissions';
import { permissionProcedure } from '@/server/procedures/permission.procedure';
import { siteSettingsService } from '@/server/services/site-settings.service';
import { parseVideoSettings } from '@/lib/video/settings';
import { settingsSchema, themeFormSchema } from './settings.schemas';

export const updateThemeSettings = permissionProcedure(
  PERMISSIONS.SETTINGS_MANAGE
)
  .input(themeFormSchema)
  .action(async ({ input, ctx }) => {
    const row = await siteSettingsService.updateThemeTokens(
      input.themeTokens,
      ctx.access
    );
    revalidatePath(PAGES.DASHBOARD.THEME);
    revalidatePath(PAGES.DASHBOARD.SETTINGS);
    revalidatePath('/dashboard', 'layout');
    return row;
  });

export const updateSiteSettings = permissionProcedure(
  PERMISSIONS.SETTINGS_MANAGE
)
  .input(settingsSchema)
  .action(async ({ input, ctx }) => {
    const parsedVideoSettings = input.videoSettings
      ? parseVideoSettings(input.videoSettings)
      : undefined;
    const normalizedSearchSettings = input.searchSettings
      ? {
          synonyms: Object.fromEntries(
            input.searchSettings.synonyms.map(item => [
              item.term,
              item.synonyms,
            ])
          ),
          pinnedResults: input.searchSettings.pinnedResults,
        }
      : undefined;
    const row = await siteSettingsService.update(
      {
        ...input,
        videoSettings: parsedVideoSettings?.ok ? parsedVideoSettings.data : undefined,
        searchSettings: normalizedSearchSettings,
      },
      ctx.access
    );
    revalidatePath(PAGES.DASHBOARD.SETTINGS);
    return row;
  });

export const updateVideoSettings = permissionProcedure(
  PERMISSIONS.SETTINGS_MANAGE
)
  .input(
    z.object({
      providers: z.record(z.enum(['youtube', 'vimeo', 'direct']), z.boolean()),
    })
  )
  .action(async ({ input, ctx }) => {
    const result = await siteSettingsService.updateVideoSettings(
      input,
      ctx.access
    );
    if (!result.ok) {
      return { ok: false, error: result.error };
    }
    revalidatePath(PAGES.DASHBOARD.SETTINGS);
    return { ok: true, data: result.data };
  });
