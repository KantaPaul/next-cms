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

/** First path segments of app routes that never belong to a site. */
const NON_SITE_SEGMENTS = new Set(['api', '_next', 'dashboard', 'login']);

/**
 * Prefixes a link typed into content (menus, buttons, rich text) with the site
 * slug. Unlike `siteHref`, it only touches root-relative paths and leaves alone
 * links that already carry the slug, app routes such as /api and /dashboard,
 * and files such as /docs/guide.pdf.
 */
export function contentHref(href: string, siteSlug?: string): string {
  if (!siteSlug || !href.startsWith('/') || href.startsWith('//')) return href;
  const path = href.split(/[?#]/)[0];
  const first = path.split('/')[1] ?? '';
  if (first === siteSlug) return href;
  if (NON_SITE_SEGMENTS.has(first)) return href;
  if (/\.[a-z0-9]+$/i.test(path)) return href;
  return siteHref(href, siteSlug);
}
