import { z } from 'zod';

export const listMediaSchema = z.object({
  search: z.string().optional(),
  folder: z.string().optional(),
  type: z.enum(['image', 'video', 'document', '']).optional(),
  page: z.number().int().min(1).optional(),
  size: z.number().int().min(1).max(100).optional(),
});

export const updateMediaSchema = z.object({
  id: z.string().min(1),
  title: z.string().trim().max(255).nullish(),
  alt: z.string().trim().max(1000).nullish(),
  folder: z.string().trim().max(60).nullish(),
});
