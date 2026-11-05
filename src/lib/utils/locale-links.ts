/**
 * Keeps visitors in their language when they follow an internal link.
 *
 * Content and menus usually hold default-language paths ("/about"). On a page
 * in another language, a link whose target has a published translation is
 * rewritten to that translation ("/es/acerca"). Links without a translation
 * stay as they are: non-default locales do not fall back to the default
 * language, so a blind "/es" prefix would 404.
 */

/** Default-language path (without the site slug) → the same content's path in one locale. */
export type LocaleLinkMap = ReadonlyMap<string, string>;

function normalizePath(path: string): string {
  if (path.length > 1 && path.endsWith('/')) return path.slice(0, -1);
  return path || '/';
}

/**
 * `href` rewritten through `map`. Only root-relative paths are touched; a
 * leading site slug (`/main/about`) is kept, and query strings and hashes are
 * carried over.
 */
export function localizeHref(
  href: string,
  map: LocaleLinkMap | null | undefined,
  siteSlug?: string
): string {
  if (!map?.size || !href.startsWith('/') || href.startsWith('//')) return href;
  const cut = href.search(/[?#]/);
  const path = cut === -1 ? href : href.slice(0, cut);
  const rest = cut === -1 ? '' : href.slice(cut);
  const slugPrefix =
    siteSlug && (path === `/${siteSlug}` || path.startsWith(`/${siteSlug}/`))
      ? `/${siteSlug}`
      : '';
  const bare = normalizePath(path.slice(slugPrefix.length) || '/');
  const localized = map.get(bare);
  if (!localized) return href;
  const joined = slugPrefix
    ? `${slugPrefix}${localized === '/' ? '' : localized}`
    : localized;
  return `${joined}${rest}`;
}
