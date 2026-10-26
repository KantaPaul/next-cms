import { z } from 'zod';
import { MESSAGES } from '@/config/messages';
import {
  PAGE_STATUS,
  POST_LAYOUT,
  VISIBILITY_STATUS,
} from '@/db/schemas/shared.schema';
import { seoSchema } from '@/db/validations/pages.validation';

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const dateish = z
  .union([z.string(), z.date()])
  .nullish()
  .transform(v => {
    if (v === undefined) return undefined;
    if (!v) return null;
    const d = v instanceof Date ? v : new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  });

const optionalText = (max: number) =>
  z
    .string()
    .max(max)
    .nullish()
    .transform(v => (v?.trim() ? v.trim() : null));

const language = z
  .string()
  .regex(/^[a-z]{2,12}$/, 'Unsupported language');

const postFields = {
  title: z.string().trim().min(1, MESSAGES.IS_REQUIRED('Title')).max(255),
  slug: z
    .string()
    .trim()
    .min(1, MESSAGES.IS_REQUIRED('Slug'))
    .max(255)
    .regex(
      slugRegex,
      'Slug can only contain lowercase letters, numbers, and dashes'
    ),
  excerpt: optionalText(300),
  featuredImage: optionalText(1000),
  status: z.enum(PAGE_STATUS, { error: MESSAGES.IS_REQUIRED('Status') }),
  visibility: z.enum(VISIBILITY_STATUS, {
    error: MESSAGES.IS_REQUIRED('Visibility'),
  }),
  language,
  scheduledAt: dateish,
  body: z.string().optional(),
  categories: z.array(z.string()).nullish(),
  tags: z.array(z.string()).nullish(),
  seo: seoSchema.partial().optional(),
};

export const createPostSchema = z.object({
  ...postFields,
  language: z.string().default('en').pipe(language),
});

export const updatePostSchema = z
  .object(postFields)
  .partial()
  .extend({ id: z.string().min(1) });

export const savePostDraftSchema = z.object({
  id: z.string().min(1),
  body: z.string().optional(),
  canvas: z.unknown().optional(),
  title: z.string().trim().min(1).max(255).optional(),
  autosave: z.boolean().default(false),
});

export const switchPostLayoutSchema = z.object({
  id: z.string().min(1),
  layout: z.enum(POST_LAYOUT),
});

export const saveTemplateSchema = z.object({
  id: z.string().min(1),
  content: z.unknown(),
});

export const postTemplateSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(150),
  description: z.string().trim().max(500).optional().nullable(),
});

export const createPostTemplateSchema = postTemplateSchema.extend({
  fromId: z.string().optional().nullable(),
});

export const updatePostTemplateSchema = postTemplateSchema.extend({
  id: z.string().min(1),
});

/** `templateId: null` uses the default template. */
export const setPostTemplateSchema = z.object({
  id: z.string().min(1),
  templateId: z.string().min(1).nullable(),
});

export type CreatePostInput = z.input<typeof createPostSchema>;
export type CreatePostOutput = z.output<typeof createPostSchema>;
export type UpdatePostInput = z.output<typeof updatePostSchema>;
export type SavePostDraftInput = z.output<typeof savePostDraftSchema>;
