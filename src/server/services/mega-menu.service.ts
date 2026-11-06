import 'server-only';
import { and, eq, inArray, isNotNull } from 'drizzle-orm';
import { db } from '@/db';
import { globalBlocks } from '@/db/schema';
import type { MegaMenuPanelSettings, MegaMenuWidth } from '@/builder/blocks/mega-menu';
import type { MenuWithItems } from './public-site.service';

/** One loaded panel, ready for NavMenu to render with BlockList. */
export type MegaMenuPanelData = {
  id: string;
  width: MegaMenuWidth;
  settings: MegaMenuPanelSettings;
  blocks: unknown[];
  zones: Record<string, unknown[]>;
};

type Content = {
  root?: { props?: Record<string, unknown> };
  content?: unknown[];
  zones?: Record<string, unknown[]>;
};

export const megaMenuService = {
  /**
   * Published mega menu panels for a menu's top-level items, keyed by menu
   * item id. Unpublished or deleted panels are skipped, so those items fall
   * back to their normal dropdown. `draft` (preview) reads the latest draft.
   * Nested block data (link lists from menus, latest posts) is resolved.
   */
  panelsFor: async (
    menu: MenuWithItems | null | undefined,
    ctx: { siteId?: string; draft?: boolean; [key: string]: unknown } = {}
  ): Promise<Record<string, MegaMenuPanelData>> => {
    const wanted = (menu?.items ?? []).filter(i => i.megaMenuId);
    if (!wanted.length) return {};
    const ids = [...new Set(wanted.map(i => i.megaMenuId!))];

    const conditions = [
      inArray(globalBlocks.id, ids),
      eq(globalBlocks.category, 'MegaMenu'),
    ];
    if (ctx.siteId) conditions.push(eq(globalBlocks.siteId, ctx.siteId));
    if (!ctx.draft) conditions.push(isNotNull(globalBlocks.publishedContent));

    const rows = await db
      .select({
        id: globalBlocks.id,
        content: globalBlocks.content,
        publishedContent: globalBlocks.publishedContent,
      })
      .from(globalBlocks)
      .where(and(...conditions));

    const { resolvePuckData } = await import('@/builder/loaders');
    const byId = new Map<string, Omit<MegaMenuPanelData, 'width'>>();
    await Promise.all(
      rows.map(async row => {
        const raw = (ctx.draft ? row.content : row.publishedContent) as Content | null;
        if (!raw || !Array.isArray(raw.content) || !raw.content.length) return;
        const data = {
          root: { props: raw.root?.props ?? {} },
          content: raw.content,
          zones: raw.zones ?? {},
        };
        const resolved = (await resolvePuckData(data as never, ctx).catch(
          () => data
        )) as Content;
        byId.set(row.id, {
          id: row.id,
          settings: (raw.root?.props ?? {}) as MegaMenuPanelSettings,
          blocks: resolved.content ?? [],
          zones: resolved.zones ?? {},
        });
      })
    );

    const panels: Record<string, MegaMenuPanelData> = {};
    for (const item of wanted) {
      const panel = byId.get(item.megaMenuId!);
      if (!panel) continue;
      const width = item.megaMenuWidth as MegaMenuWidth;
      panels[item.id] = {
        ...panel,
        width: width === 'full' || width === 'auto' ? width : 'container',
      };
    }
    return panels;
  },
};
