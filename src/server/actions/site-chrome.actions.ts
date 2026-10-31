'use server';
import { z } from 'zod';
import { publicSiteService } from '@/server/services/public-site.service';
import { siteSettingsService } from '@/server/services/site-settings.service';

/**
 * Public reads for header/footer blocks (NavMenu, FooterLinks, Logo, Copyright).
 * Called from builder loaders, which also run in the client editor bundle, so
 * the server-only services stay behind this action boundary.
 */

const menuSchema = z.object({
  location: z.enum(['header', 'footer']).catch('header'),
  language: z.string().max(10).nullish(),
});

export async function getSiteMenu(input: z.input<typeof menuSchema>) {
  const { location, language } = menuSchema.parse(input);
  return publicSiteService.menuFor(location, language ?? 'en');
}

export async function getSiteBranding() {
  const settings = await siteSettingsService.get();
  return { siteName: settings.siteName, siteLogo: settings.logo };
}
