import { z } from 'zod';

const locale = z.object({
  code: z.string().trim().min(2, 'Code is required').max(12),
  label: z.string().trim().min(1, 'Label is required').max(40),
});

export const createSiteSchema = z.object({
  name: z.string().trim().min(1, 'Site name is required').max(120),
  primaryHost: z.string().trim().max(255).nullish(),
  extraDomains: z.string().trim().max(1000).nullish(),
  defaultLocale: z.string().trim().min(2, 'Default locale is required').max(12),
  locales: z.array(locale).min(1, 'At least one locale is required'),
});

export type CreateSiteInput = z.infer<typeof createSiteSchema>;
