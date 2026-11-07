import 'server-only';
import { and, eq } from 'drizzle-orm';
import type { BuilderData } from '@/builder/data';
import { QUIET_EDITORIAL_THEME } from '@/builder/theme-presets';
import { PERMISSIONS } from '@/config/permissions';
import { db } from '@/db';
import {
  globalBlocks,
  pageTemplates,
  postTemplates,
  siteSettings,
} from '@/db/schema';
import {
  ARCHIVE_STARTER_EDITORIAL,
  FOOTER_STARTER_EDITORIAL,
  HEADER_STARTER_EDITORIAL,
  SEARCH_STARTER_EDITORIAL,
  type StarterTemplate,
} from '@/db/seed/header-footer-starters';
import {
  editorialHomePage,
  editorialPostTemplate,
} from '@/db/seed/quiet-editorial';
import { revalidatePublicSite } from '@/lib/utils/revalidate-site';
import { type UserAccess, accessService } from '@/server/services/access.service';
import { auditService } from '@/server/services/audit.service';
import { adminSiteId } from '@/server/services/site-context';
import { siteSettingsService } from '@/server/services/site-settings.service';

export type StarterKitResult = {
  headerId: string;
  footerId: string;
  archiveId: string;
  searchId: string;
  postTemplateId: string;
  pageTemplateId: string;
};

/**
 * One-click "Quiet Editorial" install: applies the theme, creates published
 * header / footer / archive / search templates and makes them the site
 * defaults, adds a default post layout, and a "Quiet Editorial home" page
 * template to create the home page from. Existing templates are kept (only the
 * defaults change), so the previous look can be restored from Site templates.
 */
export const starterKitService = {
  installQuietEditorial: async (
    access: UserAccess
  ): Promise<StarterKitResult> => {
    await accessService.assertPermission(
      access.userId,
      PERMISSIONS.SETTINGS_MANAGE
    );
    const siteId = await adminSiteId();

    // Keep the site's own custom colour tokens.
    const current = await siteSettingsService.get();
    await siteSettingsService.updateThemeTokens(
      {
        ...QUIET_EDITORIAL_THEME,
        colors: {
          ...QUIET_EDITORIAL_THEME.colors,
          custom: current.themeTokens.colors?.custom ?? [],
        },
      },
      access
    );

    const result = await db.transaction(async tx => {
      const now = new Date();
      const insertTemplate = async (starter: StarterTemplate) => {
        const content = structuredClone(starter.content);
        const [row] = await tx
          .insert(globalBlocks)
          .values({
            siteId,
            name: starter.name,
            category: starter.category,
            content,
            publishedContent: content,
            publishedAt: now,
            createdBy: access.userId,
          })
          .returning({ id: globalBlocks.id });
        return row.id;
      };

      const headerId = await insertTemplate(HEADER_STARTER_EDITORIAL);
      const footerId = await insertTemplate(FOOTER_STARTER_EDITORIAL);
      const archiveId = await insertTemplate(ARCHIVE_STARTER_EDITORIAL);
      const searchId = await insertTemplate(SEARCH_STARTER_EDITORIAL);

      await tx
        .update(siteSettings)
        .set({
          headerTemplateId: headerId,
          footerTemplateId: footerId,
          archiveTemplateId: archiveId,
          searchTemplateId: searchId,
          updatedAt: now,
        })
        .where(eq(siteSettings.siteId, siteId));

      // One default post layout per site (unique index): demote the current one.
      const post: BuilderData = editorialPostTemplate();
      await tx
        .update(postTemplates)
        .set({ isDefault: false })
        .where(and(eq(postTemplates.siteId, siteId), eq(postTemplates.isDefault, true)));
      const [postRow] = await tx
        .insert(postTemplates)
        .values({
          siteId,
          name: 'Quiet Editorial post',
          description:
            'Centred title, reading time, drop-cap body, share, author bio, previous / next and related posts.',
          content: post,
          draftContent: post,
          isDefault: true,
          createdBy: access.userId,
        })
        .returning({ id: postTemplates.id });

      const [pageRow] = await tx
        .insert(pageTemplates)
        .values({
          siteId,
          name: 'Quiet Editorial home',
          description:
            'Featured lead story with a dispatch grid, a spotlight, editorial principles, and a newsletter band.',
          category: 'Landing',
          editorType: 'builder',
          content: editorialHomePage(),
          thumbnailUrl:
            'https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=600&auto=format&fit=crop&q=80',
          createdBy: access.userId,
        })
        .returning({ id: pageTemplates.id });

      return {
        headerId,
        footerId,
        archiveId,
        searchId,
        postTemplateId: postRow.id,
        pageTemplateId: pageRow.id,
      };
    });

    await auditService.log({
      actorId: access.userId,
      action: 'create',
      targetType: 'settings',
      targetId: siteId,
      targetName: 'Quiet Editorial starter kit',
    });
    revalidatePublicSite();
    return result;
  },
};
