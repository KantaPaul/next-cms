import { z } from 'zod';

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

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
    .min(1, 'Slug is required')
    .max(150)
    .regex(slugRegex, 'Slug can only contain lowercase letters, numbers, and dashes')
    .refine(v => !RESERVED_COLLECTION_SLUGS.includes(v), 'This slug is reserved.'),
  templatePageId: z.string().nullish().optional(),
});

export type CreateCollectionInput = z.infer<typeof createCollectionSchema>;

export const collectionFieldSchema = z.object({
  key: z.string().trim().min(1, 'Key is required').max(100),
  label: z.string().trim().min(1, 'Label is required').max(150),
  type: z.enum([
    'text',
    'richtext',
    'number',
    'boolean',
    'date',
    'select',
    'media',
    'relation',
  ]),
  required: z.boolean().default(false),
  config: z.string().default('{}'),
});

export type CollectionFieldInput = z.infer<typeof collectionFieldSchema>;

export const updateCollectionSchema = z.object({
  id: z.string().min(1).optional(),
  name: z.string().trim().min(1).max(150).optional(),
  slug: z.string().trim().min(1).max(150).optional(),
  templatePageId: z.string().nullish().optional(),
});

export type UpdateCollectionInput = z.infer<typeof updateCollectionSchema>;

export const collectionEntrySlugSchema = z.object({
  slug: z.string().trim().min(1, 'Slug is required').max(200),
});

export type CollectionEntrySlugInput = z.infer<typeof collectionEntrySlugSchema>;
