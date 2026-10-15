import 'server-only';
import { eq } from 'drizzle-orm';
import { cache } from 'react';
import { db } from '@/db';
import { siteSettings, SITE_SETTINGS_ID, type ThemeTokens } from '@/db/schema';
import { PERMISSIONS } from '@/config/permissions';
import { resolveThemeTokens } from '@/builder/theme';
import { revalidatePublicSite } from '@/lib/utils/revalidate-site';
import { accessService, type UserAccess } from '@/server/services/access.service';
import { auditService } from '@/server/services/audit.service';

export type SiteSettingsInput = {
  siteName: string;
  siteDescription?: string | null;
  siteUrl?: string | null;
  logo?: string | null;
  favicon?: string | null;
  defaultOgImage?: string | null;
  headerMenuId?: string | null;
  footerMenuId?: string | null;
  themeTokens: ThemeTokens;
  robotsTxt?: string | null;
  googleAnalyticsId?: string | null;
};

export const siteSettingsService = {
  /** The singleton row, created with defaults on first read. */
  get: cache(async () => {
    try {
      const [row] = await db.select().from(siteSettings).where(eq(siteSettings.id, SITE_SETTINGS_ID)).limit(1);
      if (row) return { ...row, themeTokens: resolveThemeTokens(row.themeTokens) };

      const [created] = await db
        .insert(siteSettings)
        .values({ id: SITE_SETTINGS_ID })
        .onConflictDoNothing()
        .returning();
      const settings =
        created ?? (await db.select().from(siteSettings).where(eq(siteSettings.id, SITE_SETTINGS_ID)).limit(1))[0];
      return { ...settings, themeTokens: resolveThemeTokens(settings?.themeTokens) };
    } catch {
      return {
        id: SITE_SETTINGS_ID,
        siteName: 'Next CMS',
        siteDescription: 'Headless CMS & Visual Page Builder',
        siteUrl: 'http://localhost:3000',
        logo: null,
        favicon: null,
        defaultOgImage: null,
        headerMenuId: null,
        footerMenuId: null,
        themeTokens: resolveThemeTokens(null),
        robotsTxt: null,
        googleAnalyticsId: null,
        updatedAt: new Date(),
      };
    }
  }),

  update: async (input: SiteSettingsInput, access: UserAccess) => {
    await accessService.assertPermission(access.userId, PERMISSIONS.SETTINGS_MANAGE);
    await siteSettingsService.get();

    const [row] = await db
      .update(siteSettings)
      .set({ ...input, themeTokens: resolveThemeTokens(input.themeTokens), updatedAt: new Date() })
      .where(eq(siteSettings.id, SITE_SETTINGS_ID))
      .returning();

    await auditService.log({ actorId: access.userId, action: 'update', targetType: 'settings', targetId: SITE_SETTINGS_ID, targetName: 'Site settings' });
    revalidatePublicSite();
    return row;
  },
};

export type SiteSettings = Awaited<ReturnType<typeof siteSettingsService.get>>;
