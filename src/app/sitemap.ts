import type { MetadataRoute } from 'next';
import { PAGES } from '@/config/pages';
import { env } from '@/env.mjs';
import { blogService } from '@/server/services/blog.service';
import { publicSiteService } from '@/server/services/public-site.service';
import { siteContext } from '@/server/services/site-context';
import { siteSettingsService } from '@/server/services/site-settings.service';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [settings, pages, posts, site] = await Promise.all([
    siteSettingsService.getPublic(),
    publicSiteService.listPublishedForSitemap(),
    blogService.listPublishedForSitemap(),
    siteContext.publicSite(),
  ]);
  const base = (settings.siteUrl || env.SITE_URL).replace(/\/$/, '');
  const url = (p: { slug: string; language: string; isHome: boolean }) =>
    `${base}${PAGES.SITE.page(p.slug, p.language, p.isHome, site.defaultLocale)}`;
  const postUrl = (p: { slug: string; language: string }) =>
    `${base}${PAGES.SITE.post(p.slug, p.language, site.defaultLocale)}`;
  const indexable = pages.filter(p => !p.noIndex);
  const indexablePosts = posts.filter(p => !p.noIndex);

  const pageEntries: MetadataRoute.Sitemap = indexable.map(page => {
    const siblings = page.translationGroupId
      ? indexable.filter(p => p.translationGroupId === page.translationGroupId)
      : [];
    return {
      url: url(page),
      lastModified: page.updatedAt ?? page.publishedAt ?? undefined,
      changeFrequency: page.isHome ? 'daily' : 'weekly',
      priority: page.isHome ? 1 : 0.7,
      ...(siblings.length > 1 && {
        alternates: {
          languages: Object.fromEntries(
            siblings.map(s => [s.language, url(s)])
          ),
        },
      }),
    };
  });

  const postEntries: MetadataRoute.Sitemap = indexablePosts.map(post => {
    const siblings = post.translationGroupId
      ? indexablePosts.filter(
          p => p.translationGroupId === post.translationGroupId
        )
      : [];
    return {
      url: postUrl(post),
      lastModified: post.updatedAt ?? post.publishedAt ?? undefined,
      changeFrequency: 'monthly',
      priority: 0.6,
      ...(siblings.length > 1 && {
        alternates: {
          languages: Object.fromEntries(
            siblings.map(s => [s.language, postUrl(s)])
          ),
        },
      }),
    };
  });

  return [...pageEntries, ...postEntries];
}
