import 'server-only';
import { createId } from '@paralleldrive/cuid2';
import { eq } from 'drizzle-orm';
import { cache } from 'react';
import { resolveThemeTokens } from '@/builder/theme';
import { PERMISSIONS } from '@/config/permissions';
import { db } from '@/db';
import {
  SITE_SETTINGS_ID,
  siteSettings,
  type ThemeTokens,
  type VideoSettings,
} from '@/db/schema';
import type { SiteCopy } from '@/db/schemas/sites.schema';
import { parseVideoSettings } from '@/lib/video/settings';
import { adminSiteId, siteContext } from '@/server/services/site-context';
import { revalidatePublicSite } from '@/lib/utils/revalidate-site';
import {
  accessService,
  type UserAccess,
} from '@/server/services/access.service';
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
  videoSettings?: VideoSettings;
  robotsTxt?: string | null;
  googleAnalyticsId?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  translations?: Record<string, SiteCopy> | null;
};

export function localizedSettings(
  settings: {
    siteName: string;
    siteDescription?: string | null;
    seoTitle?: string | null;
    seoDescription?: string | null;
    translations?: Record<string, SiteCopy> | null;
  },
  locale: string,
  defaultLocale: string
) {
  const translated =
    locale === defaultLocale ? undefined : settings.translations?.[locale];
  return {
    siteName: translated?.siteName || settings.siteName,
    siteDescription: translated?.siteDescription || settings.siteDescription || null,
    seoTitle: translated?.seoTitle || settings.seoTitle || settings.siteName,
    seoDescription:
      translated?.seoDescription ||
      settings.seoDescription ||
      settings.siteDescription ||
      null,
  };
}

async function loadSettings(siteId: string) {
  try {
    const [row] = await db
      .select()
      .from(siteSettings)
      .where(eq(siteSettings.siteId, siteId))
      .limit(1);
    if (row) return { ...row, themeTokens: resolveThemeTokens(row.themeTokens) };

    const [created] = await db
      .insert(siteSettings)
      .values({
        id: siteId === SITE_SETTINGS_ID ? SITE_SETTINGS_ID : createId(),
        siteId,
      })
      .onConflictDoNothing()
      .returning();
    const settings =
      created ??
      (
        await db
          .select()
          .from(siteSettings)
          .where(eq(siteSettings.siteId, siteId))
          .limit(1)
      )[0];
    return {
      ...settings,
      themeTokens: resolveThemeTokens(settings?.themeTokens),
    };
  } catch {
    return {
      id: SITE_SETTINGS_ID,
      siteId,
      siteName: 'Next CMS',
      siteDescription: 'Headless CMS & Visual Page Builder',
      siteUrl: 'http://localhost:3000',
      logo: null,
      favicon: null,
      defaultOgImage: null,
      headerMenuId: null,
      footerMenuId: null,
      seoTitle: null,
      seoDescription: null,
      translations: null,
      themeTokens: resolveThemeTokens(null),
      robotsTxt: null,
      googleAnalyticsId: null,
      updatedAt: new Date(),
    };
  }
}

export const siteSettingsService = {
  get: cache(async () => loadSettings(await adminSiteId())),

  getPublic: cache(async () => loadSettings((await siteContext.publicSite()).id)),

  update: async (input: SiteSettingsInput, access: UserAccess) => {
    await accessService.assertPermission(
      access.userId,
      PERMISSIONS.SETTINGS_MANAGE
    );
    const siteId = await adminSiteId();
    await loadSettings(siteId);

    const [row] = await db
      .update(siteSettings)
      .set({
        ...input,
        themeTokens: resolveThemeTokens(input.themeTokens),
        updatedAt: new Date(),
      })
      .where(eq(siteSettings.siteId, siteId))
      .returning();

    await auditService.log({
      actorId: access.userId,
      action: 'update',
      targetType: 'settings',
      targetId: siteId,
      targetName: 'Site settings',
    });
    revalidatePublicSite();
    return row;
  },

  updateVideoSettings: async (
    input: unknown,
    access: UserAccess
  ): Promise<{ ok: true; data: VideoSettings } | { ok: false; error: string }> => {
    await accessService.assertPermission(
      access.userId,
      PERMISSIONS.SETTINGS_MANAGE
    );
    const siteId = await adminSiteId();
    await loadSettings(siteId);

    const parsed = parseVideoSettings(input);
    if (!parsed.ok) {
      return parsed;
    }

    await db
      .update(siteSettings)
      .set({
        videoSettings: parsed.data,
        updatedAt: new Date(),
      })
      .where(eq(siteSettings.siteId, siteId));

    await auditService.log({
      actorId: access.userId,
      action: 'update',
      targetType: 'settings',
      targetId: siteId,
      targetName: 'Site settings (video)',
    });
    revalidatePublicSite();
    return { ok: true, data: parsed.data };
  },
};

export type SiteSettings = Awaited<ReturnType<typeof siteSettingsService.get>>;
