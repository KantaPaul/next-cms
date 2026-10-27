/**
 * buildEmbed — build an allowlisted iframe src from a parsed video.
 *
 * YouTube -> https://www.youtube-nocookie.com/embed/{id}
 * Vimeo   -> https://player.vimeo.com/video/{id}
 * Direct  -> null (use native <video> instead)
 *
 * Only the fixed allowlisted hosts are ever used, never user-supplied hosts.
 */
import type { ParsedVideo } from './parse';

const YOUTUBE_EMBED_HOST = 'https://www.youtube-nocookie.com';
const VIMEO_EMBED_HOST = 'https://player.vimeo.com';

export type EmbedResult = {
  src: string;
  provider: 'youtube' | 'vimeo';
} | null;

/** Build an allowlisted iframe src. Returns null for direct files. */
export function buildEmbed(parsed: ParsedVideo): EmbedResult {
  if (parsed.provider === 'youtube') {
    return {
      src: `${YOUTUBE_EMBED_HOST}/embed/${encodeURIComponent(parsed.id)}`,
      provider: 'youtube',
    };
  }
  if (parsed.provider === 'vimeo') {
    return {
      src: `${VIMEO_EMBED_HOST}/video/${encodeURIComponent(parsed.id)}`,
      provider: 'vimeo',
    };
  }
  return null;
}

/** The hosts that are allowed as iframe embed sources. */
export const EMBED_ALLOWLIST = [
  'www.youtube-nocookie.com',
  'player.vimeo.com',
] as const;

export function isAllowlistedEmbedHost(host: string): boolean {
  return EMBED_ALLOWLIST.includes(host as (typeof EMBED_ALLOWLIST)[number]);
}
