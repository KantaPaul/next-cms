import { z } from 'zod';

export const saveEditorDraftSchema = z.object({
  id: z.string().min(1),
  baseVersion: z.number().int().min(0),
  patch: z
    .object({
      root: z.object({ props: z.record(z.string(), z.unknown()) }).optional(),
      rootSlot: z.array(z.string()).optional(),
      upsert: z.record(z.string(), z.unknown()),
      remove: z.array(z.string()),
    })
    .optional(),
  document: z.unknown().optional(),
});
