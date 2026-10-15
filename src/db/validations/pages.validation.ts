import { z } from 'zod';
import {
  EDITOR_TYPE,
  LANGUAGE_CODES,
  PAGE_STATUS,
  VISIBILITY_STATUS,
} from '@/db/schemas/shared.schema';
import { MESSAGES } from '@/config/messages';

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** First URL segments owned by app routes or language prefixes. */
export const RESERVED_SLUGS = [
  'api',
  'dashboard',
  'login',
  'logout',
  'media',
  'sitemap.xml',
  'robots.txt',
  '_next',
  ...LANGUAGE_CODES,
];

const optionalText = (max = 500) =>
  z
    .string()
    .max(max)
    .nullish()
    .transform(v => (v?.trim() ? v.trim() : null));

export const seoSchema = z.object({
  title: optionalText(255),
  description: optionalText(1000),
  keywords: optionalText(500),
  canonicalUrl: optionalText(500),
  ogTitle: optionalText(255),
  ogDescription: optionalText(1000),
  ogImage: optionalText(500),
  ogType: optionalText(50),
  twitterCard: optionalText(50),
  noIndex: z.boolean().default(false),
  structuredDataType: optionalText(50),
});

export type SeoInput = z.infer<typeof seoSchema>;

const dateish = z
  .union([z.string(), z.date()])
  .nullish()
  .transform(v => {
    if (v === undefined) return undefined;
    if (!v) return null;
    const d = v instanceof Date ? v : new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  });

const language = z
  .string()
  .refine(v => LANGUAGE_CODES.includes(v), 'Unsupported language');

/** Shared fields without defaults; defaults only belong to creation. */
const pageFields = {
  title: z.string().trim().min(1, MESSAGES.IS_REQUIRED('Title')).max(255),
  slug: z
    .string()
    .trim()
    .min(1, MESSAGES.IS_REQUIRED('Slug'))
    .max(255)
    .regex(
      slugRegex,
      'Slug can only contain lowercase letters, numbers, and dashes'
    )
    .refine(
      v => !RESERVED_SLUGS.includes(v),
      'This slug is reserved by the app. Pick another one.'
    ),
  status: z.enum(PAGE_STATUS, { error: MESSAGES.IS_REQUIRED('Status') }),
  visibility: z.enum(VISIBILITY_STATUS, {
    error: MESSAGES.IS_REQUIRED('Visibility'),
  }),
  editorType: z.enum(EDITOR_TYPE),
  language,
  isHome: z.boolean(),
  isBlogIndex: z.boolean(),
  scheduledAt: dateish,
  content: z.unknown().optional(),
  categories: z.array(z.string()).nullish(),
  tags: z.array(z.string()).nullish(),
  seo: seoSchema.partial().optional(),
  templateId: z.string().nullish(),
};

export const createPagesSchema = z.object({
  ...pageFields,
  editorType: pageFields.editorType.default('richtext'),
  language: z.string().default('en').pipe(language),
  isHome: pageFields.isHome.default(false),
  isBlogIndex: pageFields.isBlogIndex.default(false),
});

/** Every field is optional and nothing is defaulted, so partial updates never reset columns. */
export const updatePagesSchema = z
  .object(pageFields)
  .partial()
  .extend({ id: z.string().min(1) });

export const idSchema = z.object({ id: z.string().min(1) });

export const saveDraftSchema = z.object({
  id: z.string().min(1),
  content: z.unknown(),
  title: z.string().trim().min(1).max(255).optional(),
  autosave: z.boolean().default(false),
});

export const switchEditorSchema = z.object({
  id: z.string().min(1),
  editorType: z.enum(EDITOR_TYPE),
});

export const createRevisionSchema = z.object({
  id: z.string().min(1),
  label: z.string().trim().max(255).optional(),
});

export const restoreRevisionSchema = z.object({
  revisionId: z.string().min(1),
});

export const createTranslationSchema = z.object({
  id: z.string().min(1),
  language: z
    .string()
    .refine(v => LANGUAGE_CODES.includes(v), 'Unsupported language'),
});

export const createPreviewTokenSchema = z
  .object({
    pageId: z.string().min(1).nullish(),
    postId: z.string().min(1).nullish(),
    expiresInDays: z.number().int().min(1).max(365).nullish(),
  })
  .refine(
    v => !!v.pageId !== !!v.postId,
    'Choose a page or a post to preview.'
  );

export type CreatePagesInput = z.input<typeof createPagesSchema>;
export type CreatePagesOutput = z.output<typeof createPagesSchema>;
export type UpdatePagesInput = z.output<typeof updatePagesSchema>;
export type SaveDraftInput = z.output<typeof saveDraftSchema>;
