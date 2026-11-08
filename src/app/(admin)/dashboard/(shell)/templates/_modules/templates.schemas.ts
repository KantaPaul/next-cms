import { z } from 'zod';
import { EDITOR_TYPE } from '@/db/schemas/shared.schema';

export const blockItemSchema = z.object({
  type: z.string().min(1),
  props: z.record(z.string(), z.unknown()),
});

/** Empty content is allowed on create only; service enforces non-empty on update. */
export const globalBlockContentSchema = z.union([
  z.array(blockItemSchema),
  z.object({
    root: z
      .object({ props: z.record(z.string(), z.unknown()).optional() })
      .optional(),
    content: z.array(blockItemSchema),
    zones: z.record(z.string(), z.array(blockItemSchema)).optional(),
  }),
]);

export const saveGlobalBlockSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1).max(150),
  category: z.string().trim().max(50).optional(),
  content: globalBlockContentSchema,
});

export const publishGlobalBlockSchema = z.object({
  id: z.string().min(1),
});

export const renameGlobalBlockSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1).max(150),
  category: z.string().trim().max(50),
});

export const saveTemplateSchema = z.object({
  name: z.string().trim().min(1).max(150),
  description: z.string().trim().max(500).nullish(),
  category: z.string().trim().max(50).optional(),
  editorType: z.enum(EDITOR_TYPE),
  content: z.unknown(),
});

export const updateTemplateSchema = z.object({
  id: z.string().min(1),
  content: z.unknown(),
  name: z.string().trim().min(1).max(150).optional(),
  description: z.string().trim().max(500).nullish(),
  category: z.string().trim().max(50).optional(),
});
