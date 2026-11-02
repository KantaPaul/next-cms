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

/** Plain text from Puck / Builder JSON. Only string props are kept. */
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

// ---------------------------------------------------------------------------
// Locale-Aware Search Helpers, Synonyms, Pinned & Highlighting (R588–R594)
// ---------------------------------------------------------------------------

export type SearchDocumentKind = 'page' | 'post' | 'collection' | 'video';

export type PostgresTextSearchConfig =
  | 'english'
  | 'spanish'
  | 'french'
  | 'german'
  | 'simple';

const LOCALE_TO_TS_CONFIG: Record<string, PostgresTextSearchConfig> = {
  en: 'english',
  es: 'spanish',
  fr: 'french',
  de: 'german',
  ja: 'simple',
  zh: 'simple',
  ko: 'simple',
};

/**
 * Maps a site locale code (e.g. `en`, `es`, `fr`, `de`, `ja`) to an allowlisted
 * Postgres text search configuration (`R588 / QRY-18`).
 */
export function getPostgresTextSearchConfig(
  language?: string | null
): PostgresTextSearchConfig {
  if (!language) return 'english';
  const base = language.toLowerCase().split('-')[0] ?? 'en';
  return LOCALE_TO_TS_CONFIG[base] ?? 'simple';
}

/** Strips diacritics / accents from text for accent-insensitive matching (`R588 / QRY-18`). */
export function stripAccents(input: string): string {
  return input.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/** Normalizes a search query for privacy-safe analytics logging (`R592 / QRY-22`). */
export function normalizeSearchQueryLog(rawQuery: string): string {
  return rawQuery
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .slice(0, 200);
}

export type SynonymConfigInput =
  | Record<string, string[]>
  | Array<{ term: string; synonyms: string[] }>;

/**
 * Expands query tokens using per-site synonyms (`R593 / QRY-23`).
 * Returns an array of token groups, where each group is `[originalToken, ...synonyms]`.
 */
export function expandQueryWithSynonyms(
  query: string,
  synonyms: SynonymConfigInput = {}
): string[][] {
  const normalizedMap = new Map<string, Set<string>>();
  const entries: Array<[string, string[]]> = Array.isArray(synonyms)
    ? synonyms.map(item => [item.term, item.synonyms])
    : Object.entries(synonyms);

  for (const [key, list] of entries) {
    if (!Array.isArray(list)) continue;
    const cleanKey = stripAccents(key.trim().toLowerCase());
    if (!cleanKey) continue;
    const allTerms = [
      cleanKey,
      ...list.map(s => stripAccents(s.trim().toLowerCase())).filter(Boolean),
    ];
    for (const term of allTerms) {
      const set = normalizedMap.get(term) ?? new Set<string>();
      for (const t of allTerms) set.add(t);
      normalizedMap.set(term, set);
    }
  }

  const rawTokens = stripAccents(query.trim().toLowerCase())
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);

  return rawTokens.map(token => {
    const group = normalizedMap.get(token);
    if (!group || group.size <= 1) return [token];
    return Array.from(group);
  });
}

/**
 * Builds a safe Postgres `to_tsquery` string with prefix matching (`:*`) and
 * synonym expansion (`R588 / QRY-18`, `R593 / QRY-23`).
 * Example: `"cms guide"` with synonym `cms -> [headless]` becomes `"(cms:* | headless:*) & guide:*"`.
 */
export function buildPrefixTsQuery(
  query: string,
  synonyms: SynonymConfigInput = {}
): string {
  const groups = expandQueryWithSynonyms(query, synonyms);
  const sanitizeToken = (t: string) =>
    t.replace(/[^a-zA-Z0-9\u00C0-\u024F\u3040-\u30FF\u4E00-\u9FAF_-]/g, '');

  const groupExpressions = groups
    .map(group => {
      const safeTokens = group.map(sanitizeToken).filter(Boolean);
      if (safeTokens.length === 0) return '';
      if (safeTokens.length === 1) return `${safeTokens[0]}:*`;
      return `(${safeTokens.map(t => `${t}:*`).join(' | ')})`;
    })
    .filter(Boolean);

  return groupExpressions.join(' & ');
}

export interface PinnedSearchItem {
  query: string;
  path: string;
  title: string;
  kind?: SearchDocumentKind;
}

/** Returns pinned results matching a user's query (`R593 / QRY-23`). */
export function matchPinnedResults(
  query: string,
  pinnedResults: PinnedSearchItem[] = []
): PinnedSearchItem[] {
  const norm = stripAccents(query.trim().toLowerCase());
  if (!norm) return [];
  return pinnedResults.filter(item => {
    const target = stripAccents(item.query.trim().toLowerCase());
    return target && (target === norm || norm.includes(target));
  });
}

/**
 * Safely highlights matched query terms in a plain-text snippet using `<mark>` tags (`R591 / QRY-21`).
 * Escapes HTML entities before wrapping matches so it is XSS-safe.
 */
export function highlightTextSnippet(
  snippet: string,
  query: string,
  synonyms: Record<string, string[]> = {}
): string {
  const escapeHtml = (str: string) =>
    str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

  const safeSnippet = escapeHtml(snippet);
  const terms = expandQueryWithSynonyms(query, synonyms)
    .flat()
    .filter(t => t.length >= 2);
  if (terms.length === 0) return safeSnippet;

  const escapedTerms = Array.from(new Set(terms)).map(t =>
    t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  );
  const pattern = new RegExp(`(${escapedTerms.join('|')})`, 'gi');
  return safeSnippet.replace(pattern, '<mark>$1</mark>');
}
