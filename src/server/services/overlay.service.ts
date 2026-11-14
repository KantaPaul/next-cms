import 'server-only';
import { and, desc, eq, inArray } from 'drizzle-orm';
import { db } from '@/db';
import { globalBlocks } from '@/db/schema';
import type { BuilderData } from '@/builder/data';
import { renderBuilderContent } from '@/builder/render-content';
import { normalizeOverlaySettings } from '@/lib/overlays/settings';
import { matchTargeting } from '@/lib/overlays/targeting';
import type { OverlaySettings } from '@/lib/overlays/types';
import type { BuilderDocument } from '@nextcms/builder-core';
import type { ReactNode } from 'react';

export type ActiveOverlayItem = {
  id: string;
  name: string;
  category: 'Popup' | 'Drawer';
  settings: OverlaySettings;
  renderedContent: ReactNode;
  /**
   * The popup's document with per-item bindings intact, when it has any; the
   * host renders it with the Loop Grid item the popup was opened from.
   */
  clientDocument?: BuilderDocument;
  publishedAt: string | null;
  draft: boolean;
};

export type ActiveForParams = {
  siteId: string;
  pathname: string;
  entity?: {
    type?: string;
    id?: string;
    slug?: string;
  } | null;
  userState?: 'guest' | 'logged-in';
  draft?: boolean;
  metadata?: Record<string, unknown>;
};

export const overlayService = {
  activeFor: async ({
    siteId,
    pathname,
    entity,
    userState = 'guest',
    draft = false,
    metadata = {},
  }: ActiveForParams): Promise<ActiveOverlayItem[]> => {
    const rows = await db
      .select({
        id: globalBlocks.id,
        name: globalBlocks.name,
        category: globalBlocks.category,
        content: globalBlocks.content,
        publishedContent: globalBlocks.publishedContent,
        publishedAt: globalBlocks.publishedAt,
      })
      .from(globalBlocks)
      .where(
        and(
          eq(globalBlocks.siteId, siteId),
          inArray(globalBlocks.category, ['Popup', 'Drawer'])
        )
      )
      .orderBy(desc(globalBlocks.updatedAt));

    const active: ActiveOverlayItem[] = [];

    for (const row of rows) {
      // With a preview session it loads draft content; otherwise published content is required.
      const rawContent = draft ? row.content : row.publishedContent;
      if (!rawContent || typeof rawContent !== 'object') continue;

      const data = rawContent as BuilderData;
      const category = row.category === 'Drawer' ? 'Drawer' : 'Popup';
      const settings = normalizeOverlaySettings(data.root?.props, category);

      // Server-side filtering: enabled, schedule, user state, path rules
      const isMatch = matchTargeting(settings, {
        pathname,
        userState,
        entity: entity ?? undefined,
      });

      if (!isMatch) continue;

      let clientDocument: BuilderDocument | undefined;
      const renderedContent = await renderBuilderContent({
        content: data,
        onClientDocument: doc => {
          clientDocument = doc;
        },
        kind: 'page',
        metadata: {
          editing: false,
          language:
            typeof metadata.language === 'string'
              ? metadata.language
              : 'en',
          ...metadata,
          // After the page's metadata, so a popup form is looked up as this popup.
          globalBlock: { id: row.id },
        },
      });

      active.push({
        id: row.id,
        name: row.name,
        category,
        settings,
        renderedContent,
        ...(clientDocument ? { clientDocument } : {}),
        publishedAt: row.publishedAt
          ? new Date(row.publishedAt).toISOString()
          : null,
        draft,
      });
    }

    return active;
  },
};
