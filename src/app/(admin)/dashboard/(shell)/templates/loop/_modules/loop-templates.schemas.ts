import { z } from 'zod';

export const sourceSchema = z.enum(['posts', 'collection']);

export const contentSchema = z.object({
  root: z
    .object({ props: z.record(z.string(), z.unknown()).optional() })
    .optional(),
  content: z.array(
    z.object({
      type: z.string().min(1),
      props: z.record(z.string(), z.unknown()),
    })
  ),
  zones: z.record(z.string(), z.array(z.unknown())).optional(),
});

export const createLoopTemplateSchema = z.object({
  name: z.string().trim().min(1).max(150),
  sourceType: sourceSchema,
  collectionId: z.string().nullish(),
  content: contentSchema.optional(),
});

export const saveLoopTemplateSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1).max(150).optional(),
  content: contentSchema.optional(),
});

/** Templates for the Loop Grid picker, filtered to the grid's source. */
export const listLoopTemplateOptionsSchema = z
  .object({
    sourceType: sourceSchema.optional(),
    collectionId: z.string().nullish(),
  })
  .optional();
