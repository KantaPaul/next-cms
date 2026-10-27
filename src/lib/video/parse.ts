/**
 * parseVideoUrl — parse a YouTube, Vimeo, or direct MP4/WebM URL into a
 * provider-specific id. Returns null when the URL is not a supported video URL.
 *
 * YouTube: watch, youtu.be, embed, shorts, youtube-nocookie
 * Vimeo: vimeo.com/<id>, player.vimeo.com/video/<id>, channels/showcase paths
 * Direct: HTTPS .mp4 / .webm only
 */
export type ParsedVideo = {
  provider: 'youtube' | 'vimeo' | 'direct';
  /** YouTube video id, Vimeo numeric id, or the direct file URL itself. */
  id: string;
  url: string;
};

const YOUTUBE_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'youtube-nocookie.com',
  'www.youtube-nocookie.com',
  'youtu.be',
  'www.youtu.be',
]);

const VIMEO_HOSTS = new Set(['vimeo.com', 'www.vimeo.com', 'player.vimeo.com']);

const DIRECT_EXTENSIONS = ['.mp4', '.webm'];

function isHttps(url: string): boolean {
  try {
    return new URL(url).protocol === 'https:';
  } catch {
    return false;
  }
}

function youtubeId(url: string): string | null {
  try {
    const u = new URL(url);
    if (!YOUTUBE_HOSTS.has(u.hostname)) return null;

    // youtu.be/ID
    if (u.hostname === 'youtu.be') {
      const id = u.pathname.replace(/^\//, '');
      return id || null;
    }

    // /watch?v=ID
    const v = u.searchParams.get('v');
    if (v) return v;

    // /embed/ID, /embed/ID?..., /shorts/ID, /v/ID
    const match = u.pathname.match(/^\/(?:embed|shorts|v)\/([a-zA-Z0-9_-]{6,})/);
    if (match) return match[1];

    return null;
  } catch {
    return null;
  }
}

function vimeoId(url: string): string | null {
  try {
    const u = new URL(url);
    if (!VIMEO_HOSTS.has(u.hostname)) return null;

    // player.vimeo.com/video/ID
    const videoMatch = u.pathname.match(/^\/video\/(\d+)/);
    if (videoMatch) return videoMatch[1];

    // vimeo.com/ID (numeric, at least 6 digits to avoid matching channels)
    const idMatch = u.pathname.match(/^\/(\d{6,})$/);
    if (idMatch) return idMatch[1];

    // vimeo.com/channels/name/ID or /showcase/.../video/ID
    const anyId = u.pathname.match(/\/(\d{6,})(?:\/|$)/);
    if (anyId) return anyId[1];

    return null;
  } catch {
    return null;
  }
}

function directId(url: string): string | null {
  if (!isHttps(url)) return null;
  try {
    const u = new URL(url);
    const lower = u.pathname.toLowerCase();
    if (!DIRECT_EXTENSIONS.some((ext) => lower.endsWith(ext))) return null;
    return url;
  } catch {
    return null;
  }
}

/** Parse a video URL. Returns null when the URL is unsupported or invalid. */
export function parseVideoUrl(url: string): ParsedVideo | null {
  if (typeof url !== 'string' || url.trim() === '') return null;

  const trimmed = url.trim();

  const yt = youtubeId(trimmed);
  if (yt) return { provider: 'youtube', id: yt, url: trimmed };

  const vi = vimeoId(trimmed);
  if (vi) return { provider: 'vimeo', id: vi, url: trimmed };

  const dl = directId(trimmed);
  if (dl) return { provider: 'direct', id: dl, url: trimmed };

  return null;
}

export function isSupportedProvider(
  provider: 'youtube' | 'vimeo' | 'direct',
  enabledProviders: Record<string, boolean>
): boolean {
  return !!enabledProviders[provider];
}
