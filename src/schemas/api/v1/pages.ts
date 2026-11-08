import { z } from 'zod';

export const apiCreatePageSchema = z.object({
  title: z.string().trim().min(1).max(255),
  slug: z.string().trim().min(1).max(255),
  language: z.string().min(1).max(10),
  content: z.unknown().optional(),
});

export const apiUpdatePageSchema = z.object({
  title: z.string().trim().min(1).max(255).optional(),
  slug: z.string().trim().min(1).max(255).optional(),
  content: z.unknown().optional(),
});
