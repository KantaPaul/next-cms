import { z } from 'zod';

export const toggleOverlayEnabledSchema = z.object({
  id: z.string().min(1),
  enabled: z.boolean(),
});

export type ToggleOverlayEnabledInput = z.infer<typeof toggleOverlayEnabledSchema>;
