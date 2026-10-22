import type { MetadataRoute } from 'next';
import { allPages, allPosts, siteSettings } from '@/lib/content';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteSettings.siteUrl?.replace(/\/$/, '') || 'http://localhost:3000';
  const entries: MetadataRoute.Sitemap = [];

  for (const page of allPages) {
    if (page.seo?.noIndex) continue;
    entries.push({
      url: `${base}${page.path === '/' ? '' : page.path}` || base,
      lastModified: page.updatedAt ? new Date(page.updatedAt) : undefined,
      changeFrequency: page.isHome ? 'weekly' : 'monthly',
      priority: page.isHome ? 1 : 0.7,
    });
  }

  for (const post of allPosts) {
    if (post.seo?.noIndex) continue;
    entries.push({
      url: `${base}${post.path}`,
      lastModified: post.updatedAt
        ? new Date(post.updatedAt)
        : post.view.publishedAt
          ? new Date(post.view.publishedAt)
          : undefined,
      changeFrequency: 'weekly',
      priority: 0.6,
    });
  }

  return entries;
}
