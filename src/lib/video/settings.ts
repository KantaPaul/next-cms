/**
 * videoSettingsSchema + defaults for the site_settings.video_settings jsonb column.
 *
 * Shape: the full video library settings object persisted as JSONB on site_settings
 * (same pattern as theme_tokens). No separate settings table.
 *
 * Fields:
 * - enabled: master switch for the public video library.
 * - title / description: library heading shown on the widget.
 * - layout: `sidebar` (list beside the player, stacked below lg) or `stacked`.
 * - defaultPlaylistId: playlist the widget opens with when no override is set.
 * - thumbnails / descriptions: card display flags.
 * - pageSize: videos per page of the list.
 * - providers: per-provider toggles (youtube, vimeo, direct).
 * - directHostAllowlist: optional allowlist of https hosts for direct files.
 * - progress / resume / mutedAutoplay / nativePlaybackSpeed: playback behaviour.
 * - completionPercent: fraction of duration watched that counts as complete (default 0.9).
 * - nativeSeekRestriction: block native seeking past max_position_seconds.
 * - catalogMode: `all-published` | `playlist-only`.
 * - viewerAccess: `public` | `authenticated`.
 * - preferCaptions: let the provider player load captions (YouTube may set cc_load_policy=1).
 */
import { z } from 'zod';
import type { VideoSettings, VideoProvider } from '@/db/schemas/video.schema';
import { DEFAULT_VIDEO_SETTINGS } from '@/db/schemas/video.schema';

export const providerSchema = z.enum(['youtube', 'vimeo', 'direct']);
export type ProviderSchema = z.infer<typeof providerSchema>;

export const layoutSchema = z.enum(['sidebar', 'stacked']);
export type LayoutSchema = z.infer<typeof layoutSchema>;

export const catalogModeSchema = z.enum(['all-published', 'playlist-only']);
export type CatalogModeSchema = z.infer<typeof catalogModeSchema>;

export const viewerAccessSchema = z.enum(['public', 'authenticated']);
export type ViewerAccessSchema = z.infer<typeof viewerAccessSchema>;

export const videoSettingsSchema = z.object({
  enabled: z.boolean().default(true),
  title: z.string().trim().max(200).default('Videos'),
  description: z.string().trim().max(500).default(''),
  layout: layoutSchema.default('sidebar'),
  defaultPlaylistId: z.string().trim().max(150).nullish(),
  thumbnails: z.boolean().default(true),
  descriptions: z.boolean().default(true),
  pageSize: z.coerce.number().int().min(1).max(48).default(12),
  providers: z
    .record(providerSchema, z.boolean())
    .default({ youtube: true, vimeo: true, direct: true })
    .refine(
      (providers) =>
        Object.values(providers).some(Boolean),
      'At least one video provider must be enabled'
    ),
  directHostAllowlist: z.array(z.string().trim().max(255)).max(20).default([]),
  progress: z.boolean().default(true),
  resume: z.boolean().default(true),
  mutedAutoplay: z.boolean().default(false),
  nativePlaybackSpeed: z.boolean().default(true),
  completionPercent: z.coerce.number().int().min(50).max(100).default(90),
  nativeSeekRestriction: z.boolean().default(false),
  catalogMode: catalogModeSchema.default('all-published'),
  viewerAccess: viewerAccessSchema.default('public'),
  preferCaptions: z.boolean().default(false),
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

  const data = result.data;
  const providers: Record<VideoProvider, boolean> = {
    youtube: data.providers?.youtube ?? true,
    vimeo: data.providers?.vimeo ?? true,
    direct: data.providers?.direct ?? true,
  };

  const normalized: VideoSettings = {
    enabled: data.enabled ?? true,
    title: data.title ?? DEFAULT_VIDEO_SETTINGS.title,
    description: data.description ?? DEFAULT_VIDEO_SETTINGS.description,
    layout: data.layout ?? DEFAULT_VIDEO_SETTINGS.layout,
    defaultPlaylistId: data.defaultPlaylistId ?? null,
    thumbnails: data.thumbnails ?? DEFAULT_VIDEO_SETTINGS.thumbnails,
    descriptions: data.descriptions ?? DEFAULT_VIDEO_SETTINGS.descriptions,
    pageSize: data.pageSize ?? DEFAULT_VIDEO_SETTINGS.pageSize,
    providers,
    directHostAllowlist: data.directHostAllowlist ?? [],
    progress: data.progress ?? DEFAULT_VIDEO_SETTINGS.progress,
    resume: data.resume ?? DEFAULT_VIDEO_SETTINGS.resume,
    mutedAutoplay: data.mutedAutoplay ?? DEFAULT_VIDEO_SETTINGS.mutedAutoplay,
    nativePlaybackSpeed:
      data.nativePlaybackSpeed ?? DEFAULT_VIDEO_SETTINGS.nativePlaybackSpeed,
    completionPercent:
      data.completionPercent ?? DEFAULT_VIDEO_SETTINGS.completionPercent,
    nativeSeekRestriction:
      data.nativeSeekRestriction ?? DEFAULT_VIDEO_SETTINGS.nativeSeekRestriction,
    catalogMode: data.catalogMode ?? DEFAULT_VIDEO_SETTINGS.catalogMode,
    viewerAccess: data.viewerAccess ?? DEFAULT_VIDEO_SETTINGS.viewerAccess,
    preferCaptions: data.preferCaptions ?? DEFAULT_VIDEO_SETTINGS.preferCaptions,
  };

  const hasEnabledProvider = Object.values(providers).some(
    (enabled) => enabled
  );

  if (!hasEnabledProvider) {
    return {
      ok: false,
      error: 'At least one video provider must be enabled',
    };
  }

  return { ok: true, data: normalized };
}

export { DEFAULT_VIDEO_SETTINGS };
export type { VideoSettings, VideoProvider };
