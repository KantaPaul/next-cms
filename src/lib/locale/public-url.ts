export type PublicContentKind = 'page' | 'post' | 'collection';

export function buildPublicUrl({
  siteSlug,
  locale,
  defaultLocale = 'en',
  slug,
  kind = 'page',
  collectionSlug,
  isHome = false,
}: {
  siteSlug?: string | null;
  locale?: string | null;
  defaultLocale?: string;
  slug: string;
  kind?: PublicContentKind;
  collectionSlug?: string;
  isHome?: boolean;
}): string {
  const parts: string[] = [];
  if (siteSlug) parts.push(siteSlug);
  if (locale && locale !== defaultLocale) parts.push(locale);

  if (kind === 'post') {
    parts.push('blog', slug);
  } else if (kind === 'collection' && collectionSlug) {
    parts.push(collectionSlug, slug);
  } else if (!isHome && slug && slug !== 'home') {
    parts.push(slug);
  }

  return parts.length > 0 ? `/${parts.join('/')}` : '/';
}
