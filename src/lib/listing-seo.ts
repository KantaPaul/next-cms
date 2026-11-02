import { DEFAULT_LANGUAGE, LANGUAGE_CODES } from '@/db/schemas/shared.schema';

export type LocaleSiteConfig = {
  defaultLocale: string;
  locales: { code: string }[];
};

export type ArchiveRoute =
  | {
      language: string;
      kind: 'category';
      slug: string;
    }
  | {
      language: string;
      kind: 'tag';
      slug: string;
    }
  | {
      language: string;
      kind: 'author';
      authorId: string;
    }
  | {
      language: string;
      kind: 'date';
      year: number;
      month?: number;
      dateAfter: string;
      dateBefore: string;
      label: string;
    };

/**
 * Resolves archive URL segments (`/blog/category/[slug]`, `/blog/tag/[slug]`,
 * `/blog/author/[id]`, `/blog/archive/[year]`, `/blog/archive/[year]/[month]`,
 * and their `/{lang}/...` variants) into an ArchiveRoute descriptor.
 */
export function resolveArchiveRoute(
  segments: string[] = [],
  site?: LocaleSiteConfig
): ArchiveRoute | null {
  const defaultLocale = site?.defaultLocale ?? DEFAULT_LANGUAGE;
  const codes = site?.locales.map(locale => locale.code) ?? LANGUAGE_CODES;
  const parts = segments.map(s => {
    try {
      return decodeURIComponent(s);
    } catch {
      return s;
    }
  });

  let language = defaultLocale;
  let offset = 0;

  if (
    parts.length >= 4 &&
    parts[0] !== defaultLocale &&
    codes.includes(parts[0]) &&
    parts[1] === 'blog'
  ) {
    language = parts[0];
    offset = 1;
  } else if (parts.length >= 3 && parts[0] === 'blog') {
    offset = 0;
  } else {
    return null;
  }

  const archiveType = parts[offset + 1];
  const value = parts[offset + 2];
  if (!archiveType || !value) return null;

  if (archiveType === 'category' && parts.length === offset + 3) {
    return { language, kind: 'category', slug: value };
  }

  if (archiveType === 'tag' && parts.length === offset + 3) {
    return { language, kind: 'tag', slug: value };
  }

  if (archiveType === 'author' && parts.length === offset + 3) {
    return { language, kind: 'author', authorId: value };
  }

  if (
    archiveType === 'archive' &&
    (parts.length === offset + 3 || parts.length === offset + 4)
  ) {
    const year = Number.parseInt(value, 10);
    if (!Number.isFinite(year) || year < 1970 || year > 2100) return null;

    if (parts.length === offset + 3) {
      const start = new Date(Date.UTC(year, 0, 1, 0, 0, 0));
      const end = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));
      return {
        language,
        kind: 'date',
        year,
        dateAfter: start.toISOString(),
        dateBefore: end.toISOString(),
        label: String(year),
      };
    }

    const monthStr = parts[offset + 3];
    const month = Number.parseInt(monthStr ?? '', 10);
    if (!Number.isFinite(month) || month < 1 || month > 12) return null;

    const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
    const end = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
    const monthLabel = start.toLocaleDateString(language, {
      year: 'numeric',
      month: 'long',
      timeZone: 'UTC',
    });

    return {
      language,
      kind: 'date',
      year,
      month,
      dateAfter: start.toISOString(),
      dateBefore: end.toISOString(),
      label: monthLabel,
    };
  }

  return null;
}

const FILTER_PARAM_SUFFIXES = new Set([
  'q',
  'category',
  'categories',
  'tag',
  'tags',
  'author',
  'from',
  'to',
  'min',
  'max',
  'toggle',
  'sort',
]);

function firstString(
  val: string | string[] | undefined
): string | undefined {
  if (typeof val === 'string') return val.trim() || undefined;
  if (Array.isArray(val) && typeof val[0] === 'string') {
    return val[0].trim() || undefined;
  }
  return undefined;
}

/**
 * Computes listing SEO rules (R597 / QRY-27):
 * - Paginated pages are self-canonical (`?page=2` keeps `?page=2` in canonical).
 * - Filtered combinations (`?q=...`, `?category=...`, etc.) set `noIndex: true`.
 */
export function buildListingSeoMetadata(options: {
  baseCanonicalUrl: string;
  searchParams?: Record<string, string | string[] | undefined>;
  baseNoIndex?: boolean;
}): {
  canonicalUrl: string;
  noIndex: boolean;
  isFiltered: boolean;
  pageNumber: number;
} {
  const { baseCanonicalUrl, searchParams = {}, baseNoIndex = false } = options;

  let isFiltered = false;
  let pageNumber = 1;
  let pageParamKey = 'page';

  for (const [key, rawVal] of Object.entries(searchParams)) {
    const val = firstString(rawVal);
    if (!val) continue;

    if (key === 'page' || key.endsWith('_page')) {
      const parsed = Number.parseInt(val, 10);
      if (Number.isFinite(parsed) && parsed > 1) {
        pageNumber = parsed;
        pageParamKey = key;
      }
      continue;
    }

    const suffix = key.includes('_') ? key.slice(key.lastIndexOf('_') + 1) : key;
    if (FILTER_PARAM_SUFFIXES.has(key) || FILTER_PARAM_SUFFIXES.has(suffix)) {
      isFiltered = true;
    }
  }

  let canonicalUrl = baseCanonicalUrl;
  if (pageNumber > 1) {
    const separator = baseCanonicalUrl.includes('?') ? '&' : '?';
    canonicalUrl = `${baseCanonicalUrl}${separator}${encodeURIComponent(pageParamKey)}=${pageNumber}`;
  }

  return {
    canonicalUrl,
    noIndex: baseNoIndex || isFiltered,
    isFiltered,
    pageNumber,
  };
}
