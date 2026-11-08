import 'server-only';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { globalBlocks } from '@/db/schema';
import { PERMISSIONS } from '@/config/permissions';
import { accessService, type UserAccess } from '@/server/services/access.service';
import { auditService } from '@/server/services/audit.service';
import { revalidatePublicSite } from '@/lib/utils/revalidate-site';
import { NotFoundException } from '@/lib/utils/error';
import type { BuilderData } from '@/builder/data';
import type { ToggleOverlayEnabledInput } from './overlays.schemas';

export const overlayAdminService = {
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
