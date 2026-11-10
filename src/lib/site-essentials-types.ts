import { z } from 'zod';

/* ---------- Site Mode (Maintenance / Coming Soon) ---------- */

export const SITE_MODE_VALUES = ['live', 'maintenance', 'coming_soon'] as const;
export type SiteModeValue = (typeof SITE_MODE_VALUES)[number];

export type SiteModeSettings = {
  mode: SiteModeValue;
  pageBlockId?: string | null;
  bypassToken?: string | null;
  excludePaths?: string[];
};

export const DEFAULT_SITE_MODE: SiteModeSettings = {
  mode: 'live',
  pageBlockId: null,
  bypassToken: null,
  excludePaths: [],
};

export const siteModeSettingsSchema = z.object({
  mode: z.enum(SITE_MODE_VALUES).default('live'),
  pageBlockId: z.string().trim().max(100).nullish().transform(v => v || null),
  bypassToken: z.string().trim().max(200).nullish().transform(v => v || null),
  excludePaths: z
    .array(z.string().trim().max(300))
    .max(50)
    .optional()
    .default([]),
});

/* ---------- Cookie Consent ---------- */

export const CONSENT_CATEGORIES = [
  'necessary',
  'functional',
  'analytics',
  'marketing',
] as const;
export type ConsentCategory = (typeof CONSENT_CATEGORIES)[number];

export const CONSENT_MODES = ['opt-in', 'notice-only'] as const;
export type ConsentMode = (typeof CONSENT_MODES)[number];

export const CONSENT_POSITIONS = [
  'bottom-bar',
  'bottom-left',
  'bottom-right',
  'center',
] as const;
export type ConsentBannerPosition = (typeof CONSENT_POSITIONS)[number];

export type CustomCodeSlotCategories = {
  headHtml?: ConsentCategory;
  bodyStartHtml?: ConsentCategory;
  bodyEndHtml?: ConsentCategory;
};

export type ConsentSettings = {
  enabled: boolean;
  mode: ConsentMode;
  version: number;
  title: string;
  description: string;
  acceptAllLabel: string;
  rejectAllLabel: string;
  customizeLabel: string;
  saveLabel: string;
  privacyPolicyUrl?: string | null;
  privacyPolicyLabel?: string | null;
  position: ConsentBannerPosition;
  customCodeCategories?: CustomCodeSlotCategories;
};

export const DEFAULT_CONSENT_SETTINGS: ConsentSettings = {
  enabled: true,
  mode: 'opt-in',
  version: 1,
  title: 'We value your privacy',
  description:
    'We use cookies to enhance your browsing experience, measure site traffic, and load third-party embeds.',
  acceptAllLabel: 'Accept all',
  rejectAllLabel: 'Reject all',
  customizeLabel: 'Customize',
  saveLabel: 'Save preferences',
  privacyPolicyUrl: '/privacy',
  privacyPolicyLabel: 'Privacy Policy',
  position: 'bottom-bar',
  customCodeCategories: {
    headHtml: 'marketing',
    bodyStartHtml: 'marketing',
    bodyEndHtml: 'marketing',
  },
};

export const consentCategorySchema = z.enum(CONSENT_CATEGORIES);

export const consentSettingsSchema = z.object({
  enabled: z.boolean().default(true),
  mode: z.enum(CONSENT_MODES).default('opt-in'),
  version: z.coerce.number().int().min(1).max(9999).default(1),
  title: z.string().trim().min(1).max(160).default(DEFAULT_CONSENT_SETTINGS.title),
  description: z
    .string()
    .trim()
    .min(1)
    .max(1000)
    .default(DEFAULT_CONSENT_SETTINGS.description),
  acceptAllLabel: z.string().trim().min(1).max(60).default('Accept all'),
  rejectAllLabel: z.string().trim().min(1).max(60).default('Reject all'),
  customizeLabel: z.string().trim().min(1).max(60).default('Customize'),
  saveLabel: z.string().trim().min(1).max(60).default('Save preferences'),
  privacyPolicyUrl: z
    .string()
    .trim()
    .max(500)
    .nullish()
    .transform(v => v || null),
  privacyPolicyLabel: z
    .string()
    .trim()
    .max(80)
    .nullish()
    .transform(v => v || null),
  position: z.enum(CONSENT_POSITIONS).default('bottom-bar'),
  customCodeCategories: z
    .object({
      headHtml: consentCategorySchema.default('marketing'),
      bodyStartHtml: consentCategorySchema.default('marketing'),
      bodyEndHtml: consentCategorySchema.default('marketing'),
    })
    .optional()
    .default({
      headHtml: 'marketing',
      bodyStartHtml: 'marketing',
      bodyEndHtml: 'marketing',
    }),
});

/* ---------- Backup Settings ---------- */

export const BACKUP_FREQUENCIES = ['off', 'daily', 'weekly'] as const;
export type BackupFrequency = (typeof BACKUP_FREQUENCIES)[number];

export type BackupSettings = {
  frequency: BackupFrequency;
  includeMedia: boolean;
  keepLast: number;
  lastRunAt?: string | null;
  lastStatus?: 'ok' | 'failed' | null;
  lastError?: string | null;
};

export const DEFAULT_BACKUP_SETTINGS: BackupSettings = {
  frequency: 'off',
  includeMedia: true,
  keepLast: 7,
  lastRunAt: null,
  lastStatus: null,
  lastError: null,
};

export const backupSettingsSchema = z.object({
  frequency: z.enum(BACKUP_FREQUENCIES).default('off'),
  includeMedia: z.boolean().default(true),
  keepLast: z.coerce.number().int().min(1).max(100).default(7),
  lastRunAt: z.string().nullish(),
  lastStatus: z.enum(['ok', 'failed']).nullish(),
  lastError: z.string().nullish(),
});
