import 'server-only';
import { and, asc, eq, inArray, isNotNull } from 'drizzle-orm';
import { db } from '@/db';
import { globalBlocks } from '@/db/schema';
import { PERMISSIONS } from '@/config/permissions';
import { accessService, type UserAccess } from '@/server/services/access.service';
import { auditService } from '@/server/services/audit.service';
import { adminSiteId } from '@/server/services/site-context';
import { revalidatePublicSite } from '@/lib/utils/revalidate-site';
import { NotFoundException } from '@/lib/utils/error';
import { normalizeOverlaySettings } from '@/lib/overlays/settings';
import type { BuilderData } from '@/builder/data';
import type { ToggleOverlayEnabledInput } from './overlays.schemas';

export type OverlayOption = {
  id: string;
  name: string;
  category: 'Popup' | 'Drawer';
  published: boolean;
  enabled: boolean;
};

function isOverlayContentEnabled(
  content: unknown,
  category: 'Popup' | 'Drawer'
): boolean {
  if (!content || typeof content !== 'object') return false;
  const data = content as BuilderData;
  return normalizeOverlaySettings(data.root?.props, category).enabled;
}

export const overlayAdminService = {
  listOptions: async (): Promise<OverlayOption[]> => {
    const siteId = await adminSiteId();
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
          inArray(globalBlocks.category, ['Popup', 'Drawer']),
          isNotNull(globalBlocks.publishedAt),
          isNotNull(globalBlocks.publishedContent)
        )
      )
      .orderBy(asc(globalBlocks.name));
    return rows.flatMap(r => {
      const category = r.category === 'Drawer' ? 'Drawer' : 'Popup';
      const published = !!r.publishedAt && !!r.publishedContent;
      const enabled =
        isOverlayContentEnabled(r.publishedContent, category) &&
        isOverlayContentEnabled(r.content, category);
      if (!published || !enabled) return [];
      return [
        {
          id: r.id,
          name: r.name,
          category,
          published: true,
          enabled: true,
        },
      ];
    });
  },

  toggleOverlayEnabled: async (
    access: UserAccess,
    input: ToggleOverlayEnabledInput
  ) => {
    await accessService.assertPermission(access.userId, PERMISSIONS.PAGES_PUBLISH);

    const [row] = await db
      .select()
      .from(globalBlocks)
      .where(eq(globalBlocks.id, input.id))
      .limit(1);

    if (!row || (row.category !== 'Popup' && row.category !== 'Drawer')) {
      throw new NotFoundException('Overlay not found');
    }

    const patchProps = (content: unknown) => {
      if (!content || typeof content !== 'object') {
        return {
          root: { props: { enabled: input.enabled } },
          content: [],
          zones: {},
        };
      }

      const data = content as BuilderData;
      const root = data.root ?? { props: {} };
      const props = root.props ?? {};
      return {
        ...data,
        root: {
          ...root,
          props: {
            ...props,
            enabled: input.enabled,
          },
        },
      };
    };

    const updatedContent = patchProps(row.content);
    const updatedPublished = row.publishedContent
      ? patchProps(row.publishedContent)
      : null;

    await db
      .update(globalBlocks)
      .set({
        content: updatedContent,
        ...(updatedPublished && { publishedContent: updatedPublished }),
        updatedAt: new Date(),
      })
      .where(eq(globalBlocks.id, input.id));

    await auditService.log({
      actorId: access.userId,
      action: 'update',
      targetType: 'global_block',
      targetId: row.id,
      targetName: row.name,
    });

    await revalidatePublicSite(row.siteId);

    return { success: true, enabled: input.enabled };
  },
};
