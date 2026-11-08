import { z } from 'zod';

export const targetSchema = z.object({
  kind: z.enum(['page', 'post']),
  id: z.string().min(1),
});

export const targetWithNoteSchema = targetSchema.extend({
  note: z.string().min(1),
});
