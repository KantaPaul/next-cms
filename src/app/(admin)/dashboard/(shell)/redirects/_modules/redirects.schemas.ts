import { z } from 'zod';

export const createRedirectSchema = z.object({
  fromPath: z.string().trim().min(1, 'From path is required').max(500),
  toPath: z.string().trim().min(1, 'To path is required').max(500),
  statusCode: z.enum(['301', '302']),
});

export type CreateRedirectInput = z.infer<typeof createRedirectSchema>;

export const redirectInputSchema = z.object({
  fromPath: z.string().min(1),
  toPath: z.string().min(1),
  statusCode: z.union([z.literal(301), z.literal(302)]).optional(),
});

export const acceptRedirectOfferSchema = z.object({
  fromPath: z.string().min(1),
  toPath: z.string().min(1),
});

export const importRedirectsSchema = z.object({ csv: z.string().min(1) });
