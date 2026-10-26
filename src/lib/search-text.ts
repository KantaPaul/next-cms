const SKIP_KEYS = new Set([
  'id',
  'section',
  'style',
  'styles',
  'icon',
  'type',
  'actionUrl',
  'href',
  'url',
  'src',
  'link',
  'target',
  'rel',
  'formId',
  'globalBlockId',
]);

function pushText(value: string, out: string[]) {
  const text = value
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (text.length < 2) return;
  if (/^https?:\/\//i.test(text) || text.startsWith('/')) return;
  if (/^#[0-9a-f]{3,8}$/i.test(text)) return;
  out.push(text);
}

function walk(value: unknown, out: string[]) {
  if (typeof value === 'string') {
    pushText(value, out);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) walk(item, out);
    return;
  }
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    if (SKIP_KEYS.has(key)) continue;
    walk(child, out);
  }
}

/** Plain text from Puck JSON. Only string props are kept. */
export function extractDocumentText(value: unknown) {
  const parts: string[] = [];
  walk(value, parts);
  return parts.join(' ').replace(/\s+/g, ' ').trim();
}

export function stripHtml(value: string) {
  return value
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
