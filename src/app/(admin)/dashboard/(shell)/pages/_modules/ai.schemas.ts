import { z } from 'zod';

export const seoResultSchema = z.object({
  title: z.string().min(1).max(70),
  description: z.string().min(1).max(170),
  keywords: z.string().max(300),
});

export const rewriteSchema = z.object({
  props: z.record(z.string(), z.unknown()),
  mode: z.enum(['rewrite', 'shorten', 'expand', 'translate']),
  language: z.string().optional(),
  tone: z.string().max(60).optional(),
  instruction: z.string().trim().max(300).optional(),
});

export const generateSeoSchema = z.object({ pageId: z.string().min(1) });

export const generateAltTextSchema = z.object({ mediaId: z.string().min(1) });

/** Model output for a copy rewrite: the same keys as the input, new text as values. */
export const rewriteResultSchema = (keys: string[]) =>
  z
    .record(z.string(), z.string())
    .refine(value => keys.every(k => typeof value[k] === 'string'), {
      message: `Every key must be present: ${keys.join(', ')}`,
    });

/** Model output for image alt text. */
export const altTextResultSchema = z.object({
  alt: z.string().min(1).max(200),
});
