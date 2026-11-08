import { z } from 'zod';

export const menuSchema = z.object({
  location: z.enum(['header', 'footer']).catch('header'),
  language: z.string().max(10).nullish(),
});

export const liveSearchSchema = z.object({
  query: z.string().trim().max(100),
  language: z.string().max(10).nullish(),
  limit: z.number().int().min(1).max(20).optional().default(6),
});
