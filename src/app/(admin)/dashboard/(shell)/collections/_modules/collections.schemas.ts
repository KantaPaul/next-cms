import { z } from 'zod';
import { COLLECTION_BLOCK_EDITOR_KINDS } from '@/config/block-manager';
import {
  POST_TYPE_FIELD_TYPES,
  POST_TYPE_FIELD_TYPE_VALUES,
  POST_TYPE_ICONS,
} from '@/config/post-types';

export const COLLECTION_SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Reserved collection slugs owned by the app. */
export const RESERVED_COLLECTION_SLUGS = [
  'api',
  'dashboard',
  'login',
  'logout',
  'media',
  'sitemap.xml',
  'robots.txt',
  '_next',
  'blog',
];

export const createCollectionSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(150),
  slug: z
    .string()
    .trim()
    .max(150)
    .optional()
    .refine(
      v => !v || COLLECTION_SLUG_REGEX.test(v),
      'Slug can only contain lowercase letters, numbers, and dashes'
    )
    .refine(
      v => !v || !RESERVED_COLLECTION_SLUGS.includes(v),
      'This slug is reserved.'
    ),
  singularName: z.string().trim().max(150).optional(),
  icon: z.enum(POST_TYPE_ICONS).optional(),
  description: z.string().trim().max(500).optional(),
  templatePageId: z.string().nullish().optional(),
});

export type CreateCollectionInput = z.infer<typeof createCollectionSchema>;

export const FIELD_TYPES = POST_TYPE_FIELD_TYPES;

export const collectionFieldSchema = z.object({
  key: z
    .string()
    .trim()
    .max(100)
    .regex(/^[a-z0-9_]*$/, 'Use lowercase letters, numbers and underscores.')
    .optional(),
  label: z.string().trim().min(1, 'Label is required').max(150),
  type: z.enum(POST_TYPE_FIELD_TYPE_VALUES),
  required: z.boolean().default(false),
  /** Select choices, one per line or comma-separated. */
  choices: z.string().optional(),
  /** Related post type id for relation fields. */
  relationCollectionId: z.string().optional(),
});

export type CollectionFieldInput = z.infer<typeof collectionFieldSchema>;

export const updateCollectionSchema = z.object({
  id: z.string().min(1).optional(),
  name: z.string().trim().min(1).max(150).optional(),
  slug: z.string().trim().min(1).max(150).optional(),
  singularName: z.string().trim().max(150).optional(),
  icon: z.enum(POST_TYPE_ICONS).optional(),
  description: z.string().trim().max(500).optional(),
  templatePageId: z.string().nullish().optional(),
});

export type UpdateCollectionInput = z.infer<typeof updateCollectionSchema>;

export const collectionEntrySlugSchema = z.object({
  slug: z.string().trim().min(1, 'Slug is required').max(200),
});

export type CollectionEntrySlugInput = z.infer<
  typeof collectionEntrySlugSchema
>;

export const updateSupportsSchema = z.object({
  id: z.string().min(1),
  supports: z.object({
    template: z.boolean().optional(),
    taxonomies: z.boolean().optional(),
    excerpt: z.boolean().optional(),
    author: z.boolean().optional(),
    status: z.boolean().optional(),
    seo: z.boolean().optional(),
    comments: z.boolean().optional(),
  }),
});

export type UpdateSupportsInput = z.infer<typeof updateSupportsSchema>;

export const updateCollectionBlockSettingsSchema = z.object({
  id: z.string().min(1),
  collectionSlug: z.string().min(1),
  blockSettings: z.object({
    hidden: z.partialRecord(
      z.enum(COLLECTION_BLOCK_EDITOR_KINDS),
      z.array(z.string().max(100)).max(300)
    ),
  }),
});

export const collectionTaxonomySchema = z.object({
  id: z.string().optional(),
  collectionId: z.string().min(1),
  key: z
    .string()
    .trim()
    .min(1, 'Key is required')
    .max(100)
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      'Use lowercase letters, numbers, and dashes.'
    ),
  name: z.string().trim().min(1, 'Name is required').max(150),
  singularName: z.string().trim().max(150).optional(),
  hierarchical: z.boolean().default(false),
  position: z.number().int().default(0),
});

export type CollectionTaxonomyInput = z.infer<typeof collectionTaxonomySchema>;

export function generateTermSuffix(): string {
  const num = Math.floor(100000 + Math.random() * 900000);
  return `TC${num}`;
}

export const collectionTermSchema = z.object({
  id: z.string().optional(),
  taxonomyId: z.string().min(1),
  name: z.string().trim().min(1, 'Name is required').max(150),
  slug: z
    .string()
    .trim()
    .min(1, 'Slug is required')
    .max(150)
    .regex(
      /^[a-zA-Z0-9]+(?:-[a-zA-Z0-9]+)*$/,
      'Use letters, numbers, and dashes.'
    ),
  description: z.string().trim().max(1000).optional(),
  parentId: z.string().nullish().optional(),
  position: z.number().int().default(0),
});

export type CollectionTermInput = z.infer<typeof collectionTermSchema>;

export const entryEditorSchema = z.object({
  id: z.string().optional(),
  collectionId: z.string().min(1),
  slug: z.string().trim().max(200).optional(),
  status: z
    .enum(['draft', 'review', 'scheduled', 'published'])
    .default('draft'),
  visibility: z.enum(['public', 'private']).default('public'),
  scheduledAt: z.string().nullish().optional(),
  excerpt: z.string().max(1000).nullish().optional(),
  featuredImage: z.string().nullish().optional(),
  layout: z.enum(['template', 'custom']).optional(),
  templateId: z.string().nullish().optional(),
  /** Language of a new entry; fixed once created (translations are separate rows). */
  language: z
    .string()
    .regex(/^[a-z]{2,12}$/)
    .nullish()
    .optional(),
  data: z.record(z.string(), z.unknown()).default({}),
  terms: z.record(z.string(), z.array(z.string())).default({}),
  allowComments: z.boolean().optional(),
  seo: z
    .object({
      title: z.string().trim().max(100).optional().nullable(),
      description: z.string().trim().max(300).optional().nullable(),
      keywords: z.string().trim().max(200).optional().nullable(),
      canonicalUrl: z
        .string()
        .trim()
        .url()
        .optional()
        .nullable()
        .or(z.literal('')),
      ogTitle: z.string().trim().max(100).optional().nullable(),
      ogDescription: z.string().trim().max(300).optional().nullable(),
      ogImage: z.string().trim().optional().nullable(),
      ogType: z.string().trim().default('article'),
      twitterCard: z.string().trim().default('summary_large_image'),
      noIndex: z.boolean().default(false),
      structuredDataType: z.string().trim().default('WebPage'),
    })
    .optional(),
});

export type EntryEditorInput = z.infer<typeof entryEditorSchema>;

export const createEntrySchema = z.object({
  collectionId: z.string().min(1),
  slug: z.string().trim().max(200).optional(),
});

export const entryTranslationSchema = z.object({
  id: z.string().min(1),
  language: z.string().regex(/^[a-z]{2,12}$/),
});

/** Inline field editor (label / type / required) on the field list. */
export const updateFieldSchema = z.object({
  label: z.string().min(1, 'Label is required').max(150),
  type: z.enum(FIELD_TYPES.map(t => t.value) as [string, ...string[]]),
  required: z.boolean(),
});

export type UpdateFieldInput = z.infer<typeof updateFieldSchema>;

/** Entry create/edit form: slug plus any custom field values. */
export const entryFormSchema = z
  .object({ slug: z.string().optional() })
  .catchall(z.unknown());

export type EntryFormValues = z.infer<typeof entryFormSchema>;

export const updateEntrySchema = z.object({
  entryId: z.string().min(1),
  collectionId: z.string().min(1),
  slug: z.string().trim().min(1).max(200).optional(),
});
