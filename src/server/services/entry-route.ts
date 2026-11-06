/** Shared by the public page route and the language switcher. */

/**
 * Collection entry routes, with an optional language prefix for non-default
 * languages (like pages and posts):
 *   /{type}/{entry}              /collections/{type}/{entry}
 *   /{lang}/{type}/{entry}       /{lang}/collections/{type}/{entry}
 * Returns [collectionSlug, entrySlug, language].
 */
export function resolveEntryRoute(
  segments: string[] | undefined,
  site: { defaultLocale?: string; locales: { code: string }[] }
): [string | undefined, string | undefined, string] {
  const defaultLocale = site.defaultLocale || 'en';
  const none: [undefined, undefined, string] = [undefined, undefined, defaultLocale];
  if (!Array.isArray(segments) || segments.length < 2) return none;
  const localeCodes = site.locales.map(l => l.code) ?? [];

  let language = defaultLocale;
  let parts = segments;
  if (
    parts.length >= 3 &&
    parts[0] !== defaultLocale &&
    localeCodes.includes(parts[0])
  ) {
    language = parts[0];
    parts = parts.slice(1);
  }
  if (parts[0] === 'collections') parts = parts.slice(1);
  if (parts.length !== 2) return none;

  const [collectionSlug, entrySlug] = parts;
  if (
    !collectionSlug ||
    !entrySlug ||
    collectionSlug === 'blog' ||
    localeCodes.includes(collectionSlug)
  ) {
    return none;
  }
  return [collectionSlug, entrySlug, language];
}
