import { env } from '@/env.mjs';
import { siteSettingsService } from '@/server/services/site-settings.service';

export const dynamic = 'force-dynamic';

/** Serves the robots.txt edited in site settings, falling back to a sensible default. */
export async function GET() {
  const settings = await siteSettingsService.get();
  const base = (settings.siteUrl || env.SITE_URL).replace(/\/$/, '');
  const body =
    settings.robotsTxt?.trim() ||
    [
      'User-agent: *',
      'Allow: /',
      'Disallow: /dashboard',
      'Disallow: /api',
      '',
      `Sitemap: ${base}/sitemap.xml`,
    ].join('\n');

  return new Response(`${body}\n`, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
