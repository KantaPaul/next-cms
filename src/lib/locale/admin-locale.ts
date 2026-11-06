/**
 * The dashboard's working language: picked in the header's LangSwitcher,
 * kept in a cookie so it survives navigation and reloads, and passed to list
 * pages as the `language` search param (their language filter).
 */
export const ADMIN_LOCALE_COOKIE = 'cms_locale';

/** Dashboard routes whose list filters by `?language=`. */
export const LANGUAGE_FILTERED_ROUTES = new Set([
  '/dashboard/pages',
  '/dashboard/posts',
]);

/** A post type's entries list: `/dashboard/collections/{slug}`. */
const COLLECTION_ENTRIES_ROUTE = /^\/dashboard\/collections\/[^/]+$/;

/** Whether `path` is a list that filters by `?language=`. */
export function isLanguageFilteredRoute(path: string): boolean {
  return (
    LANGUAGE_FILTERED_ROUTES.has(path) || COLLECTION_ENTRIES_ROUTE.test(path)
  );
}

/** The cookie's value if it names one of the site's locales, else null. */
export function pickAdminLocale(
  value: string | null | undefined,
  locales: { code: string }[]
): string | null {
  if (!value) return null;
  const code = decodeURIComponent(value);
  return locales.some(locale => locale.code === code) ? code : null;
}

/** `href` with `?language=<locale>` when it is a language-filtered list. */
export function withAdminLanguage(href: string, locale: string | null): string {
  if (!locale) return href;
  const [path, query = ''] = href.split('?');
  if (!isLanguageFilteredRoute(path)) return href;
  const params = new URLSearchParams(query);
  params.set('language', locale);
  return `${path}?${params.toString()}`;
}
