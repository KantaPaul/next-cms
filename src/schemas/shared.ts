import { z } from 'zod';

/** `{ id }` payload shared by most single-record server actions. */
export const idSchema = z.object({ id: z.string().min(1) });

export type IdInput = z.infer<typeof idSchema>;
