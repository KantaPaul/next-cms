import { z } from 'zod';

export const entrySchema = z.object({
  id: z.string().max(100),
  siteId: z.string().max(100),
  collectionId: z.string().max(100),
  language: z.string().max(10),
  publishedAt: z.union([z.string(), z.date()]).nullable().optional(),
  createdAt: z.union([z.string(), z.date()]).nullable().optional(),
  collection: z.object({
    slug: z.string().max(200),
    fields: z.array(z.object({ key: z.string(), type: z.string() })).optional(),
  }),
});
