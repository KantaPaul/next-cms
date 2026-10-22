import type { MetadataRoute } from 'next';
import { siteSettings } from '@/lib/content';

export default function robots(): MetadataRoute.Robots {
  const base = siteSettings.siteUrl?.replace(/\/$/, '') || 'http://localhost:3000';
  return {
    rules: { userAgent: '*', allow: '/' },
    sitemap: `${base}/sitemap.xml`,
  };
}
