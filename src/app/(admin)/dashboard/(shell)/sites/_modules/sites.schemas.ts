import { z } from 'zod';
import { validateSiteSlug } from '@/lib/utils/site-slug';

const locale = z.object({
  code: z.string().trim().min(2, 'Code is required').max(12),
  label: z.string().trim().min(1, 'Label is required').max(40),
});

export const createSiteSchema = z.object({
  name: z.string().trim().min(1, 'Site name is required').max(120),
  slug: z
    .string()
    .trim()
    .min(1, 'Site slug is required')
    .refine(
      (value: string) => validateSiteSlug(value).ok,
      'Invalid site slug. Use lowercase letters, numbers and hyphens (2–40 chars), not a reserved route or locale code.'
    ),
  primaryHost: z.string().trim().max(255).nullish(),
  extraDomains: z.string().trim().max(1000).nullish(),
  defaultLocale: z.string().trim().min(2, 'Default locale is required').max(12),
  locales: z.array(locale).min(1, 'At least one locale is required'),
});

export type CreateSiteInput = z.infer<typeof createSiteSchema>;
