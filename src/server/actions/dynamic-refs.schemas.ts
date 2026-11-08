import { z } from 'zod';

export const idsSchema = z.array(z.string().max(100)).max(200).catch([]);

export const refsSchema = z.object({
  pageRef: idsSchema.optional(),
  postRef: idsSchema.optional(),
});
