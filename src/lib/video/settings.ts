/**
 * videoSettingsSchema + defaults for the site_settings.video_settings jsonb column.
 *
 * Shape: { providers: { youtube: boolean; vimeo: boolean; direct: boolean } }
 */
import { z } from 'zod';
import type { VideoSettings, VideoProvider } from '@/db/schemas/video.schema';
import { DEFAULT_VIDEO_SETTINGS } from '@/db/schemas/video.schema';

export const providerSchema = z.enum(['youtube', 'vimeo', 'direct']);
export type ProviderSchema = z.infer<typeof providerSchema>;

export const videoSettingsSchema = z.object({
  providers: z
    .record(providerSchema, z.boolean())
    .default({ youtube: true, vimeo: true, direct: true })
    .refine(
      (providers) =>
        Object.values(providers).some(Boolean),
      'At least one video provider must be enabled'
    ),
});
export type VideoSettingsInput = z.input<typeof videoSettingsSchema>;
export type VideoSettingsOutput = z.output<typeof videoSettingsSchema>;

/** Validate and normalize incoming video settings. */
export function parseVideoSettings(
  input: unknown
): { ok: true; data: VideoSettings } | { ok: false; error: string } {
  const result = videoSettingsSchema.safeParse(input);
  if (!result.success) {
    return {
      ok: false,
      error: result.error.issues.map((i) => i.message).join('; '),
    };
  }
  const providers: Record<VideoProvider, boolean> = {
    ...result.data.providers,
    youtube: result.data.providers.youtube ?? true,
    vimeo: result.data.providers.vimeo ?? true,
    direct: result.data.providers.direct ?? true,
  };
  return { ok: true, data: { providers } };
}

export { DEFAULT_VIDEO_SETTINGS };
