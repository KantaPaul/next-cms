import { z } from 'zod';

export const createRedirectSchema = z.object({
  fromPath: z.string().trim().min(1, 'From path is required').max(500),
  toPath: z.string().trim().min(1, 'To path is required').max(500),
  statusCode: z.enum(['301', '302']),
});

export type CreateRedirectInput = z.infer<typeof createRedirectSchema>;
