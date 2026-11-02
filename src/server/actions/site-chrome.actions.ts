'use server';
import { z } from 'zod';
import { publicSiteService } from '@/server/services/public-site.service';
import { siteSettingsService } from '@/server/services/site-settings.service';
import { searchIndex } from '@/server/services/search.service';

/**
 * Public reads for header/footer blocks (NavMenu, FooterLinks, Logo, Copyright, SearchBox).
 * Called from builder loaders and client components, so
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

const liveSearchSchema = z.object({
  query: z.string().trim().max(100),
  language: z.string().max(10).nullish(),
  limit: z.number().int().min(1).max(20).optional().default(6),
});

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

