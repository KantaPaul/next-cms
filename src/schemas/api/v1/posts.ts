import { z } from 'zod';

export const apiCreatePostSchema = z.object({
  title: z.string().trim().min(1).max(255),
  slug: z.string().trim().min(1).max(255),
  language: z.string().min(1).max(10),
  body: z.string().optional(),
});

export const apiUpdatePostSchema = z.object({
  title: z.string().trim().min(1).max(255).optional(),
  slug: z.string().trim().min(1).max(255).optional(),
  body: z.string().optional(),
});
