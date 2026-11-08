import { z } from 'zod';

export const startPageExperimentSchema = z.object({
  pageId: z.string(),
  variantContent: z.string(),
  weight: z.number().min(1).max(99).default(50),
});

export const pickPageExperimentWinnerSchema = z.object({
  pageId: z.string(),
  winner: z.enum(['a', 'b']),
});

export const endPageExperimentSchema = z.object({
  pageId: z.string(),
});
