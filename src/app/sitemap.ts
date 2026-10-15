import type { MetadataRoute } from 'next';
import { PAGES } from '@/config/pages';
import { env } from '@/env.mjs';
import { publicSiteService } from '@/server/services/public-site.service';
import { siteSettingsService } from '@/server/services/site-settings.service';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [settings, pages] = await Promise.all([siteSettingsService.get(), publicSiteService.listPublishedForSitemap()]);
  const base = (settings.siteUrl || env.SITE_URL).replace(/\/$/, '');
  const url = (p: { slug: string; language: string; isHome: boolean }) => `${base}${PAGES.SITE.page(p.slug, p.language, p.isHome)}`;
  const indexable = pages.filter(p => !p.noIndex);

  return indexable.map(page => {
    const siblings = page.translationGroupId ? indexable.filter(p => p.translationGroupId === page.translationGroupId) : [];
    return {
      url: url(page),
      lastModified: page.updatedAt ?? page.publishedAt ?? undefined,
      changeFrequency: page.isHome ? 'daily' : 'weekly',
      priority: page.isHome ? 1 : 0.7,
      ...(siblings.length > 1 && {
        alternates: { languages: Object.fromEntries(siblings.map(s => [s.language, url(s)])) },
      }),
    };
  });
}
