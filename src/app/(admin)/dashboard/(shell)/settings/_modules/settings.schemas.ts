import { z } from 'zod';
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

export const settingsSchema = z.object({
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
  }),
  videoSettings: z
    .object({
      providers: z.record(z.enum(['youtube', 'vimeo', 'direct']), z.boolean()),
    })
    .nullish(),
});

export type SettingsInput = z.infer<typeof settingsSchema>;
