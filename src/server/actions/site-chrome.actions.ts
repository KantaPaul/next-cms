'use server';
import { z } from 'zod';
import { publicSiteService } from '@/server/services/public-site.service';
import { siteSettingsService } from '@/server/services/site-settings.service';
import { searchIndex } from '@/server/services/search.service';
import { menuSchema, liveSearchSchema } from './site-chrome.schemas';

/**
 * Public reads for header/footer blocks (NavMenu, FooterLinks, Logo, Copyright, SearchBox).
 * Called from builder loaders and client components, so
 * the server-only services stay behind this action boundary.
 */

export async function getSiteMenu(input: z.input<typeof menuSchema>) {
  const { location, language } = menuSchema.parse(input);
  return publicSiteService.menuFor(location, language ?? 'en');
}

export async function getSiteBranding() {
  // Public read: get() resolves the admin site from the session and fails for visitors.
  const settings = await siteSettingsService.getPublic();
  return { siteName: settings.siteName, siteLogo: settings.logo };
}

export type LiveSearchResultItem = {
  kind: 'page' | 'post' | 'collection' | 'video';
  title: string;
  path: string;
  language: string;
  snippet?: string;
  thumbnailUrl?: string | null;
  pinned?: boolean;
};

export async function liveSearch(
  input: z.input<typeof liveSearchSchema>
): Promise<LiveSearchResultItem[]> {
  const { query, language, limit } = liveSearchSchema.parse(input);
  if (!query || query.length < 2) return [];
  try {
    const results = await searchIndex.suggest({ q: query, language, limit });
    return results.map(r => ({
      kind: r.kind,
      title: r.title,
      path: r.path,
      language: r.language,
      snippet: r.snippet || undefined,
      thumbnailUrl: r.thumbnailUrl ?? null,
      pinned: r.pinned,
    }));
  } catch (err) {
    console.error('[site-chrome.actions] liveSearch error:', err);
    return [];
  }
}
