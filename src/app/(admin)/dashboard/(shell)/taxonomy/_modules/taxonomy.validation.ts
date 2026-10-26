import { z } from 'zod';

const slug = z
  .string()
  .trim()
  .min(1, 'Slug is required')
  .max(150)
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    'Use lowercase letters, numbers, and dashes'
  );

export const categorySchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, 'Name is required').max(100),
  slug,
  description: z
    .string()
    .nullish()
    .transform(v => v?.trim() || null),
  parentId: z
    .string()
    .nullish()
    .transform(v => v || null),
});

export const tagSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, 'Name is required').max(100),
  slug,
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Use a hex colour like #6366f1')
    .default('#6366f1'),
});

export const deleteSchema = z.object({ id: z.string().min(1) });

export type CategoryInput = z.output<typeof categorySchema>;
export type TagInput = z.output<typeof tagSchema>;
