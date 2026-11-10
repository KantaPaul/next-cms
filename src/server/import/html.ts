import { sanitizeRichText } from '@/builder/sanitize';

export type RewriteUrlMaps = {
  /** Exact old URL (and normalized path) -> new URL. */
  urlMap: Map<string, string>;
  /** Old WP post/page ID -> new URL (for `/?p=123` and `/?page_id=123`). */
  idMap: Map<string, string>;
  /** Old WordPress site origin / base URL, if known. */
  oldSiteUrl?: string;
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function normalizeUrlKey(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  try {
    const u = new URL(trimmed);
    const path = u.pathname.length > 1 && u.pathname.endsWith('/')
      ? u.pathname.slice(0, -1)
      : u.pathname;
    return `${u.origin.toLowerCase()}${path}${u.search}`;
  } catch {
    if (trimmed.startsWith('/')) {
      return trimmed.length > 1 && trimmed.endsWith('/')
        ? trimmed.slice(0, -1)
        : trimmed;
    }
    return trimmed;
  }
}

/** Strips WordPress resized image suffix like `-300x200` or `-scaled` before extension. */
function stripWpSizeSuffix(url: string): string {
  return url.replace(/(?:-\d+x\d+|-scaled)(\.[a-z0-9]+)(?:[?#].*)?$/i, '$1');
}

function toEmbedHtml(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  if (!trimmed) return '';
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return '';
  }
  const host = parsed.hostname.replace(/^www\.|^m\./, '').toLowerCase();
  if (host === 'youtube.com' || host === 'youtu.be') {
    const videoId =
      host === 'youtu.be'
        ? parsed.pathname.replace(/^\//, '').split('/')[0]
        : parsed.searchParams.get('v') ||
          parsed.pathname.match(/\/embed\/([^/?]+)/)?.[1];
    if (videoId && /^[a-zA-Z0-9_-]{4,30}$/.test(videoId)) {
      return `<iframe src="https://www.youtube.com/embed/${videoId}" width="560" height="315" allowfullscreen="true" title="Embedded video"></iframe>`;
    }
  }
  if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    const match = parsed.pathname.match(/(\d+)/);
    if (match) {
      return `<iframe src="https://player.vimeo.com/video/${match[1]}" width="560" height="315" allowfullscreen="true" title="Embedded video"></iframe>`;
    }
  }
  const safeHref = escapeHtml(trimmed);
  return `<p><a href="${safeHref}">${safeHref}</a></p>`;
}

/**
 * Strips Gutenberg block comments (`<!-- wp:... -->` and `<!-- /wp:... -->`).
 */
export function stripGutenbergComments(html: string): string {
  return html.replace(/<!--\s*\/?wp:[\s\S]*?-->/g, '');
}

/**
 * Converts `[caption]` and `[embed]` shortcodes into HTML and strips/unwraps
 * remaining WordPress shortcodes safely.
 */
export function transformShortcodes(html: string): string {
  let out = html;

  // [caption id="..." align="..." width="..."]<img .../> Caption text[/caption]
  out = out.replace(
    /\[caption\b[^\]]*\]([\s\S]*?)\[\/caption\]/gi,
    (_match, inner: string) => {
      const mediaMatch = inner.match(
        /^\s*(<a\b[^>]*>\s*<img\b[^>]*\/?>\s*<\/a>|<img\b[^>]*\/?>)\s*([\s\S]*)$/i
      );
      if (mediaMatch) {
        const mediaHtml = mediaMatch[1].trim();
        const captionText = mediaMatch[2].trim();
        return captionText
          ? `<figure>${mediaHtml}<figcaption>${captionText}</figcaption></figure>`
          : `<figure>${mediaHtml}</figure>`;
      }
      return `<figure>${inner.trim()}</figure>`;
    }
  );

  // [embed ...]https://...[/embed]
  out = out.replace(
    /\[embed\b[^\]]*\]([\s\S]*?)\[\/embed\]/gi,
    (_match, inner: string) => toEmbedHtml(inner)
  );

  // Unwrap paired shortcodes ([tag ...]inner[/tag]) keeping their inner HTML/text
  let prev = '';
  while (prev !== out) {
    prev = out;
    out = out.replace(
      /\[([a-zA-Z0-9_-]+)(?:\s+[^\]]*)?\]([\s\S]*?)\[\/\1\]/g,
      (_match, _tag, inner: string) => inner
    );
  }

  // Drop remaining self-closing / standalone shortcodes ([gallery ...], [contact-form-7 ...])
  out = out.replace(/\[[a-zA-Z][a-zA-Z0-9_-]*(?:\s+[^\]]*)?\/?\]/g, '');

  return out;
}

/**
 * Resolves an old URL against the import urlMap and idMap.
 */
export function rewriteImportedUrl(
  rawUrl: string,
  maps?: RewriteUrlMaps
): string {
  if (!maps || !rawUrl) return rawUrl;
  const trimmed = rawUrl.trim();
  if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('mailto:') || trimmed.startsWith('tel:')) {
    return rawUrl;
  }

  // Check ?p=ID or ?page_id=ID
  try {
    const base = maps.oldSiteUrl || 'http://placeholder.invalid';
    const parsed = new URL(trimmed, base);
    const pId = parsed.searchParams.get('p') ?? parsed.searchParams.get('page_id');
    if (pId && maps.idMap.has(pId)) {
      const target = maps.idMap.get(pId)!;
      return parsed.hash ? `${target}${parsed.hash}` : target;
    }
  } catch {
    // ignore invalid URL
  }

  const normalized = normalizeUrlKey(trimmed);
  if (maps.urlMap.has(trimmed)) return maps.urlMap.get(trimmed)!;
  if (normalized && maps.urlMap.has(normalized)) return maps.urlMap.get(normalized)!;

  // Try matching by path-only if URL belongs to oldSiteUrl
  if (maps.oldSiteUrl) {
    try {
      const oldOrigin = new URL(maps.oldSiteUrl).origin.toLowerCase();
      const candidate = new URL(trimmed, maps.oldSiteUrl);
      if (candidate.origin.toLowerCase() === oldOrigin) {
        const pathOnly =
          candidate.pathname.length > 1 && candidate.pathname.endsWith('/')
            ? candidate.pathname.slice(0, -1)
            : candidate.pathname;
        if (maps.urlMap.has(pathOnly)) {
          return candidate.hash ? `${maps.urlMap.get(pathOnly)!}${candidate.hash}` : maps.urlMap.get(pathOnly)!;
        }
        const strippedPath = stripWpSizeSuffix(pathOnly);
        if (strippedPath !== pathOnly && maps.urlMap.has(strippedPath)) {
          return maps.urlMap.get(strippedPath)!;
        }
      }
    } catch {
      // ignore
    }
  }

  // Try stripping WordPress image thumbnail dimensions (`-300x200.jpg`)
  const unresized = stripWpSizeSuffix(trimmed);
  if (unresized !== trimmed) {
    if (maps.urlMap.has(unresized)) return maps.urlMap.get(unresized)!;
    const normUnresized = normalizeUrlKey(unresized);
    if (normUnresized && maps.urlMap.has(normUnresized)) {
      return maps.urlMap.get(normUnresized)!;
    }
  }

  return rawUrl;
}

/**
 * Rewrites `href`, `src`, and `poster` attributes in HTML using the import maps.
 */
export function rewriteHtmlUrls(html: string, maps?: RewriteUrlMaps): string {
  if (!maps) return html;
  return html.replace(
    /\b(href|src|poster)\s*=\s*(["'])([^"']*)\2/gi,
    (_match, attr: string, quote: string, val: string) => {
      const next = rewriteImportedUrl(val, maps);
      return `${attr}=${quote}${escapeHtml(next)}${quote}`;
    }
  );
}

/**
 * Light wpautop: if WordPress classic editor content uses blank lines without
 * block-level HTML tags, wrap paragraphs in `<p>` so rich text keeps line breaks.
 */
function ensureParagraphs(html: string): string {
  const trimmed = html.trim();
  if (!trimmed) return '';
  if (/<(?:p|div|h[1-6]|ul|ol|li|blockquote|figure|table|pre|iframe)\b/i.test(trimmed)) {
    return trimmed;
  }
  return trimmed
    .split(/\n{2,}/)
    .map(chunk => chunk.trim())
    .filter(Boolean)
    .map(chunk => `<p>${chunk.replace(/\n/g, '<br />')}</p>`)
    .join('\n');
}

/**
 * Full WordPress body cleanup pipeline:
 * 1. Strip Gutenberg comments
 * 2. Convert [caption] / [embed] shortcodes and strip other shortcodes
 * 3. Rewrite internal links and media URLs
 * 4. Ensure paragraphs for classic plain-text posts
 * 5. Sanitize via `sanitizeRichText`
 */
export function cleanWordPressHtml(
  rawHtml: string,
  maps?: RewriteUrlMaps
): string {
  if (typeof rawHtml !== 'string' || !rawHtml.trim()) return '';
  const noGutenberg = stripGutenbergComments(rawHtml);
  const withShortcodes = transformShortcodes(noGutenberg);
  const rewritten = rewriteHtmlUrls(withShortcodes, maps);
  const paragraphed = ensureParagraphs(rewritten);
  return sanitizeRichText(paragraphed).trim();
}
