/**
 * Path routing (`/{site}/…`): links typed into content are stored without the
 * site slug, so they keep working if the site moves or routing changes. This
 * adds the slug at render time, after loaders have filled in menus.
 */
import type { BuilderDocument } from '@nextcms/builder-core';
import { contentHref } from '@/lib/utils/site-href';

/** Prop names that hold a link: link, href, url, primaryButtonLink, mediaUrl… */
const LINK_KEY = /(link|href|url)$/i;
const HTML_HREF = /href=(["'])(\/[^"']*)\1/g;

/** Prefixes root-relative `href` attributes in an HTML string. */
export function prefixHtmlLinks(html: string, siteSlug: string): string {
  if (!html.includes('href=')) return html;
  return html.replace(HTML_HREF, (_match, quote: string, href: string) => `href=${quote}${contentHref(href, siteSlug)}${quote}`);
}

function prefixValue(value: unknown, key: string, siteSlug: string): unknown {
  if (typeof value === 'string') {
    return LINK_KEY.test(key) ? contentHref(value, siteSlug) : prefixHtmlLinks(value, siteSlug);
  }
  if (Array.isArray(value)) return value.map(item => prefixValue(item, key, siteSlug));
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([childKey, child]) => [childKey, prefixValue(child, childKey, siteSlug)])
    );
  }
  return value;
}

/** A copy of the document with every internal content link prefixed with `siteSlug`. */
export function prefixDocumentLinks(doc: BuilderDocument, siteSlug: string): BuilderDocument {
  const nodes = Object.fromEntries(
    Object.entries(doc.nodes).map(([id, node]) => [
      id,
      { ...node, props: prefixValue(node.props, '', siteSlug) as typeof node.props },
    ])
  );
  return { ...doc, nodes };
}
