/**
 * Path routing (`/{site}/…`): links typed into content are stored without the
 * site slug, so they keep working if the site moves or routing changes. This
 * adds the slug at render time, after loaders have filled in menus.
 */
import type { BuilderDocument } from '@nextcms/builder-core';
import { type LocaleLinkMap, localizeHref } from '@/lib/utils/locale-links';
import { contentHref } from '@/lib/utils/site-href';

/** Prop names that hold a link: link, href, url, primaryButtonLink, mediaUrl… */
const LINK_KEY = /(link|href|url)$/i;
const HTML_HREF = /href=(["'])(\/[^"']*)\1/g;

/** An internal link for this render: its translation in the page's locale (if any), then the site slug. */
function linkFor(href: string, siteSlug: string, locales?: LocaleLinkMap | null): string {
  return contentHref(localizeHref(href, locales, siteSlug), siteSlug);
}

/** Prefixes root-relative `href` attributes in an HTML string. */
export function prefixHtmlLinks(
  html: string,
  siteSlug: string,
  locales?: LocaleLinkMap | null
): string {
  if (!html.includes('href=')) return html;
  return html.replace(HTML_HREF, (_match, quote: string, href: string) => `href=${quote}${linkFor(href, siteSlug, locales)}${quote}`);
}

function prefixValue(
  value: unknown,
  key: string,
  siteSlug: string,
  locales?: LocaleLinkMap | null
): unknown {
  if (typeof value === 'string') {
    return LINK_KEY.test(key) ? linkFor(value, siteSlug, locales) : prefixHtmlLinks(value, siteSlug, locales);
  }
  if (Array.isArray(value)) return value.map(item => prefixValue(item, key, siteSlug, locales));
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([childKey, child]) => [childKey, prefixValue(child, childKey, siteSlug, locales)])
    );
  }
  return value;
}

/**
 * A copy of the document with every internal content link prefixed with
 * `siteSlug` (path routing; '' for none) and, given `locales`, pointed at its
 * translation in the page's language.
 */
export function prefixDocumentLinks(
  doc: BuilderDocument,
  siteSlug: string,
  locales?: LocaleLinkMap | null
): BuilderDocument {
  const nodes = Object.fromEntries(
    Object.entries(doc.nodes).map(([id, node]) => [
      id,
      { ...node, props: prefixValue(node.props, '', siteSlug, locales) as typeof node.props },
    ])
  );
  return { ...doc, nodes };
}
