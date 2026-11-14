export const RESERVED_DASHBOARD_SEGMENTS = new Set([
  'account',
  'analytics',
  'api',
  'collections',
  'comments',
  'contact-forms',
  'dev',
  'external-api',
  'licenses',
  'media',
  'menus',
  'pages',
  'plugins',
  'posts',
  'redirects',
  'review',
  'seo',
  'settings',
  'site-templates',
  'sites',
  'taxonomy',
  'templates',
  'theme',
  'tools',
  'users',
  'videos',
]);

const LOCALE_SEGMENT_RE = /^[a-z]{2,3}(-[A-Za-z]{2,4})?$/;

function splitPathAndSuffix(input: string): { path: string; suffix: string } {
  const qIndex = input.indexOf('?');
  const hIndex = input.indexOf('#');
  let splitAt = -1;
  if (qIndex !== -1 && hIndex !== -1) splitAt = Math.min(qIndex, hIndex);
  else if (qIndex !== -1) splitAt = qIndex;
  else if (hIndex !== -1) splitAt = hIndex;

  if (splitAt === -1) return { path: input, suffix: '' };
  return { path: input.slice(0, splitAt), suffix: input.slice(splitAt) };
}

export function isDashboardLocaleSegment(segment: string | undefined): boolean {
  if (!segment) return false;
  if (RESERVED_DASHBOARD_SEGMENTS.has(segment)) return false;
  return LOCALE_SEGMENT_RE.test(segment);
}

/**
 * Extracts a locale prefix from `/dashboard/{locale}/...` if present.
 * Returns `{ locale: null, path }` when no locale segment is present.
 */
export function stripAdminLocale(pathname: string): {
  locale: string | null;
  path: string;
} {
  const { path, suffix } = splitPathAndSuffix(pathname);
  if (path !== '/dashboard' && !path.startsWith('/dashboard/')) {
    return { locale: null, path: pathname };
  }

  const segments = path.split('/').filter(Boolean);
  // segments[0] === 'dashboard'
  const candidate = segments[1];
  if (!isDashboardLocaleSegment(candidate)) {
    return { locale: null, path: pathname };
  }

  const rest = segments.slice(2);
  const basePath = rest.length > 0 ? `/dashboard/${rest.join('/')}` : '/dashboard';
  return { locale: candidate, path: `${basePath}${suffix}` };
}

/**
 * Used by proxy.ts to detect and rewrite `/dashboard/{locale}/...` -> `/dashboard/...`.
 */
export function dashboardLocale(pathname: string): {
  locale: string | null;
  rewritePath: string | null;
} {
  const { locale, path } = stripAdminLocale(pathname);
  if (!locale) return { locale: null, rewritePath: null };
  return { locale, rewritePath: path };
}

/**
 * Builds a locale-aware `/dashboard/...` URL.
 * The default locale has no prefix; other locales get `/dashboard/{locale}/...`.
 */
export function adminHref(
  href: string,
  locale: string | null | undefined,
  defaultLocale = 'en'
): string {
  const { path, suffix } = splitPathAndSuffix(href);
  if (path !== '/dashboard' && !path.startsWith('/dashboard/')) {
    return href;
  }

  const stripped = stripAdminLocale(path).path;
  if (!locale || locale === defaultLocale) {
    return `${stripped}${suffix}`;
  }

  const rest = stripped === '/dashboard' ? '' : stripped.slice('/dashboard'.length);
  return `/dashboard/${locale}${rest}${suffix}`;
}

/**
 * Swaps the locale in the current dashboard URL (preserving path and query string).
 */
export function swapAdminLocale(
  pathnameWithSearch: string,
  nextLocale: string,
  defaultLocale = 'en'
): string {
  return adminHref(pathnameWithSearch, nextLocale, defaultLocale);
}
