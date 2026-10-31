'use server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { PAGES } from '@/config/pages';
import { PERMISSIONS } from '@/config/permissions';
import { permissionProcedure } from '@/server/procedures/permission.procedure';
import { siteSettingsService } from '@/server/services/site-settings.service';
import { parseVideoSettings } from '@/lib/video/settings';

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform(v => v || null);

const hex = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, 'Use a hex colour like #4f46e5');

const settingsSchema = z.object({
  siteName: z.string().trim().min(1, 'Site name is required').max(100),
  siteDescription: optionalText(500),
  siteUrl: optionalText(255).refine(
    v => !v || /^https?:\/\/[^\s]+$/.test(v),
    'Use a full URL like https://example.com'
  ),
  logo: optionalText(1000),
  favicon: optionalText(1000),
  defaultOgImage: optionalText(1000),
  headerMenuId: optionalText(50),
  footerMenuId: optionalText(50),
  headerTemplateId: optionalText(50),
  footerTemplateId: optionalText(50),
  robotsTxt: optionalText(5000),
  seoTitle: optionalText(160),
  seoDescription: optionalText(300),
  translations: z
    .record(
      z.string(),
      z.object({
        siteName: z.string().trim().max(100).optional(),
        siteDescription: z.string().trim().max(500).optional(),
        seoTitle: z.string().trim().max(160).optional(),
        seoDescription: z.string().trim().max(300).optional(),
        headerTemplateId: optionalText(50),
        footerTemplateId: optionalText(50),
      })
    )
    .nullish(),
  googleAnalyticsId: optionalText(50).refine(
    v => !v || /^G-[A-Z0-9]+$/i.test(v),
    'Use a GA4 measurement ID like G-XXXXXXX'
  ),
  themeTokens: z.object({
    primaryColor: hex,
    accentColor: hex,
    fontFamily: z.enum([
      'Inter',
      'Plus Jakarta Sans',
      'JetBrains Mono',
      'System',
    ]),
    borderRadius: z.enum(['none', 'sm', 'md', 'lg', 'full']),
    colorMode: z.enum(['light', 'dark', 'system']),
    colors: z
      .object({
        primary: hex.optional(),
        secondary: hex.optional(),
        text: hex.optional(),
        textMuted: hex.optional(),
        accent: hex.optional(),
        background: hex.optional(),
        surface: hex.optional(),
        border: hex.optional(),
        custom: z
          .array(
            z.object({
              id: z.string().max(50),
              name: z.string().max(50),
              value: hex,
            })
          )
          .optional(),
      })
      .optional(),
    typography: z
      .array(
        z.object({
          id: z.string().max(50),
          name: z.string().max(50),
          fontFamily: z.string().max(100).optional(),
          fontSize: z
            .union([
              z.string().max(50),
              z.number(),
              z.object({
                desktop: z.union([z.string().max(50), z.number()]).optional(),
                tablet: z.union([z.string().max(50), z.number()]).optional(),
                mobile: z.union([z.string().max(50), z.number()]).optional(),
              }),
            ])
            .optional(),
          fontWeight: z.union([z.string().max(20), z.number()]).optional(),
          lineHeight: z.union([z.string().max(20), z.number()]).optional(),
          letterSpacing: z.string().max(20).optional(),
        })
      )
      .optional(),
  }),
  videoSettings: z
    .object({
      providers: z.record(z.enum(['youtube', 'vimeo', 'direct']), z.boolean()),
    })
    .nullish(),
});

export const updateSiteSettings = permissionProcedure(
  PERMISSIONS.SETTINGS_MANAGE
)
  .input(settingsSchema)
  .action(async ({ input, ctx }) => {
    const parsedVideoSettings = input.videoSettings
      ? parseVideoSettings(input.videoSettings)
      : undefined;
    const row = await siteSettingsService.update(
      {
        ...input,
        videoSettings: parsedVideoSettings?.ok ? parsedVideoSettings.data : undefined,
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
