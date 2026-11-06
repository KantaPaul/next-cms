'use server';

import type { MenuWithItems } from '@/server/services/public-site.service';
import {
  type MegaMenuPanelData,
  megaMenuService,
} from '@/server/services/mega-menu.service';
import { getPreviewSession } from '@/server/services/preview-session';

type ItemRef = { id: string; megaMenuId?: string | null; megaMenuWidth?: string | null };

/**
 * Public read used by the NavMenu loader (which also runs in the editor's
 * browser bundle, so it reaches the database through this action). Only
 * published panels are returned unless the caller has a preview session.
 */
export async function getMegaMenuPanels(
  menu: MenuWithItems | null | undefined,
  ctx: { siteId?: string; language?: string; siteSlug?: string; draft?: boolean } = {}
): Promise<Record<string, MegaMenuPanelData>> {
  const items: ItemRef[] = (Array.isArray(menu?.items) ? menu.items : [])
    .slice(0, 50)
    .filter(i => typeof i?.id === 'string' && typeof i.megaMenuId === 'string')
    .map(i => ({ id: i.id, megaMenuId: i.megaMenuId, megaMenuWidth: i.megaMenuWidth }));
  if (!items.length) return {};
  const draft = !!ctx.draft && !!(await getPreviewSession().catch(() => null));
  return megaMenuService.panelsFor({ items } as unknown as MenuWithItems, {
    siteId: typeof ctx.siteId === 'string' ? ctx.siteId : undefined,
    language: typeof ctx.language === 'string' ? ctx.language : undefined,
    siteSlug: typeof ctx.siteSlug === 'string' ? ctx.siteSlug : undefined,
    draft,
  });
}
