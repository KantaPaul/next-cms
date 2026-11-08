import { z } from 'zod';

export const apiCreateEntrySchema = z.object({
  slug: z.string().trim().min(1).max(200),
  data: z.unknown(),
});

export const apiUpdateEntrySchema = z.object({
  slug: z.string().trim().min(1).max(200).optional(),
  data: z.unknown().optional(),
});
