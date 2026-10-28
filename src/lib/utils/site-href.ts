/** Schemes that are never prefixed with the site slug. */
const EXTERNAL_SCHEMES = /^[a-z][a-z0-9+.-]*:/i;

/**
 * Prefixes an internal public URL with the site slug in path/both mode,
 * leaving external links (absolute URLs, protocol-relative, mailto:, tel:,
 * hash-only) untouched. Pass `siteSlug` undefined/empty in host mode.
 */
export function siteHref(href: string, siteSlug?: string): string {
  if (!href || href.startsWith('#') || href.startsWith('//')) return href;
  if (EXTERNAL_SCHEMES.test(href)) return href;
  if (!siteSlug) return href;
  const normalized = href.startsWith('/') ? href : `/${href}`;
  return `/${siteSlug}${normalized === '/' ? '' : normalized}`;
}
