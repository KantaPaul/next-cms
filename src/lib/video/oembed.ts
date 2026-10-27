/**
 * Official oEmbed client for YouTube and Vimeo only.
 *
 * YouTube: https://www.youtube.com/oembed?url={url}&format=json
 * Vimeo:   https://vimeo.com/api/oembed.json?url={url}
 *
 * Direct files are never fetched on the server.
 */
import type { ParsedVideo } from './parse';

export type OEmbedResult = {
  title: string;
  author: string;
  thumbnailUrl: string;
  width: number;
  height: number;
  provider: 'youtube' | 'vimeo';
};

const YOUTUBE_OEMBED = 'https://www.youtube.com/oembed';
const VIMEO_OEMBED = 'https://vimeo.com/api/oembed.json';

function buildYouTubeOEmbedUrl(videoUrl: string): string {
  const params = new URLSearchParams({
    url: videoUrl,
    format: 'json',
  });
  return `${YOUTUBE_OEMBED}?${params.toString()}`;
}

function buildVimeoOEmbedUrl(videoUrl: string): string {
  const params = new URLSearchParams({ url: videoUrl });
  return `${VIMEO_OEMBED}?${params.toString()}`;
}

/** Fetch oEmbed metadata for a YouTube or Vimeo video. Returns null on failure. */
export async function fetchOEmbed(
  parsed: ParsedVideo
): Promise<OEmbedResult | null> {
  if (parsed.provider === 'direct') return null;

  let oembedUrl: string;
  if (parsed.provider === 'youtube') {
    oembedUrl = buildYouTubeOEmbedUrl(parsed.url);
  } else {
    oembedUrl = buildVimeoOEmbedUrl(parsed.url);
  }

  try {
    const res = await fetch(oembedUrl, {
      headers: { Accept: 'application/json' },
      // oEmbed endpoints are public; keep the timeout short.
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as Record<string, unknown>;

    const thumbnailUrl =
      typeof data.thumbnail_url === 'string' ? data.thumbnail_url : '';
    const title = typeof data.title === 'string' ? data.title : '';
    const author =
      typeof data.author_name === 'string' ? data.author_name : '';
    const width = typeof data.width === 'number' ? data.width : 640;
    const height = typeof data.height === 'number' ? data.height : 360;

    return {
      title,
      author,
      thumbnailUrl,
      width,
      height,
      provider: parsed.provider,
    };
  } catch {
    return null;
  }
}
