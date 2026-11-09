import 'server-only';
import {
  type BlockSettings,
  DEFAULT_BLOCK_SETTINGS,
  normalizeBlockSettings,
} from '@/config/block-manager';
import { createId } from '@paralleldrive/cuid2';
import { eq } from 'drizzle-orm';
import { cache } from 'react';
import { resolveThemeTokens } from '@/builder/theme';
import { PERMISSIONS } from '@/config/permissions';
import { db } from '@/db';
import {
  SITE_SETTINGS_ID,
  siteSettings,
  DEFAULT_VIDEO_SETTINGS,
  DEFAULT_SEARCH_SETTINGS,
  DEFAULT_READING_SETTINGS,
  DEFAULT_LICENSE_SETTINGS,
  DEFAULT_AUTH_SETTINGS,
  DEFAULT_CUSTOM_CODE,
  type CustomCodeSettings,
  type CustomFont,
  licenseSettingsSchema,
  authSettingsSchema,
  type ThemeTokens,
  type VideoSettings,
  type SearchSettings,
  type ReadingSettings,
  type LicenseSettings,
  type AuthSettings,
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
  headerTemplateId?: string | null;
  footerTemplateId?: string | null;
  searchTemplateId?: string | null;
  archiveTemplateId?: string | null;
  themeTokens?: ThemeTokens;
  videoSettings?: VideoSettings;
  searchSettings?: SearchSettings | null;
  readingSettings?: ReadingSettings | null;
  licenseSettings?: LicenseSettings;
  authSettings?: AuthSettings;
  robotsTxt?: string | null;
  googleAnalyticsId?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  translations?: Record<string, SiteCopy> | null;
  customCode?: CustomCodeSettings | null;
  customFonts?: CustomFont[] | null;
};

export function localizedSettings(
  settings: {
    siteName: string;
    siteDescription?: string | null;
    seoTitle?: string | null;
    seoDescription?: string | null;
    headerTemplateId?: string | null;
    footerTemplateId?: string | null;
    searchTemplateId?: string | null;
    archiveTemplateId?: string | null;
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
    headerTemplateId:
      translated?.headerTemplateId ?? settings.headerTemplateId ?? null,
    footerTemplateId:
      translated?.footerTemplateId ?? settings.footerTemplateId ?? null,
    searchTemplateId:
      translated?.searchTemplateId ?? settings.searchTemplateId ?? null,
    archiveTemplateId:
      translated?.archiveTemplateId ?? settings.archiveTemplateId ?? null,
  };
}

async function loadSettings(siteId: string) {
  try {
    const [row] = await db
      .select()
      .from(siteSettings)
      .where(eq(siteSettings.siteId, siteId))
      .limit(1);
    if (row)
      return {
        ...row,
        themeTokens: resolveThemeTokens(row.themeTokens),
        blockSettings: normalizeBlockSettings(row.blockSettings),
      };

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
      licenseSettings: (settings?.licenseSettings as LicenseSettings) ?? DEFAULT_LICENSE_SETTINGS,
      authSettings: (settings?.authSettings as AuthSettings) ?? DEFAULT_AUTH_SETTINGS,
      blockSettings: normalizeBlockSettings(settings?.blockSettings),
      customCode: (settings?.customCode as CustomCodeSettings) ?? DEFAULT_CUSTOM_CODE,
      customFonts: (settings?.customFonts as CustomFont[]) ?? [],
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
      headerTemplateId: null,
      footerTemplateId: null,
      searchTemplateId: null,
      archiveTemplateId: null,
      seoTitle: null,
      seoDescription: null,
      translations: null,
      themeTokens: resolveThemeTokens(null),
      videoSettings: DEFAULT_VIDEO_SETTINGS,
      searchSettings: DEFAULT_SEARCH_SETTINGS,
      readingSettings: DEFAULT_READING_SETTINGS,
      licenseSettings: DEFAULT_LICENSE_SETTINGS,
      authSettings: DEFAULT_AUTH_SETTINGS,
      blockSettings: DEFAULT_BLOCK_SETTINGS,
      customCode: DEFAULT_CUSTOM_CODE,
      customFonts: [],
      robotsTxt: null,
      googleAnalyticsId: null,
      updatedAt: new Date(),
    };
  }
}

async function authSettingsSiteId() {
  return (await siteContext.systemSiteContext()).id;
}

export const siteSettingsService = {
  get: cache(async () => loadSettings(await adminSiteId())),

  getPublic: cache(async () => loadSettings((await siteContext.publicSite()).id)),

  getAuthSettings: cache(async (): Promise<AuthSettings> => {
    try {
      // Auth settings are install-wide and must not depend on the session:
      // validateSession reads them, so resolving the admin site here would recurse.
      const settings = await loadSettings(await authSettingsSiteId());
      const raw = settings?.authSettings;
      const parsed = authSettingsSchema.safeParse(raw);
      return parsed.success ? parsed.data : DEFAULT_AUTH_SETTINGS;
    } catch {
      return DEFAULT_AUTH_SETTINGS;
    }
  }),

  update: async (input: SiteSettingsInput, access: UserAccess) => {
    await accessService.assertPermission(
      access.userId,
      PERMISSIONS.SETTINGS_MANAGE
    );
    const siteId = await adminSiteId();
    const current = await loadSettings(siteId);

    let authSettingsToSave: AuthSettings | undefined = undefined;
    if (input.authSettings) {
      // Validate schema and caps; ensure no role field can be set
      const parsed = authSettingsSchema.parse(input.authSettings);
      authSettingsToSave = parsed;
    }

    const [row] = await db
      .update(siteSettings)
      .set({
        ...input,
        themeTokens: resolveThemeTokens(
          input.themeTokens ?? current.themeTokens
        ),
        searchSettings: input.searchSettings ?? undefined,
        readingSettings: input.readingSettings ?? undefined,
        licenseSettings: input.licenseSettings ?? undefined,
        customCode: input.customCode ?? undefined,
        customFonts: input.customFonts ?? undefined,
        authSettings: undefined,
        updatedAt: new Date(),
      })
      .where(eq(siteSettings.siteId, siteId))
      .returning();

    if (authSettingsToSave) {
      const authSiteId = await authSettingsSiteId();
      await loadSettings(authSiteId);
      await db
        .update(siteSettings)
        .set({ authSettings: authSettingsToSave, updatedAt: new Date() })
        .where(eq(siteSettings.siteId, authSiteId));
    }

    await auditService.log({
      actorId: access.userId,
      action: input.authSettings ? 'settings_change' : 'update',
      targetType: 'settings',
      targetId: siteId,
      targetName: 'Site settings',
      details: input.authSettings ? JSON.stringify({ authSettings: authSettingsToSave }) : undefined,
    });
    revalidatePublicSite();
    return row;
  },

  updateThemeTokens: async (
    themeTokens: ThemeTokens,
    access: UserAccess
  ) => {
    await accessService.assertPermission(
      access.userId,
      PERMISSIONS.SETTINGS_MANAGE
    );
    const siteId = await adminSiteId();
    await loadSettings(siteId);

    const [row] = await db
      .update(siteSettings)
      .set({
        themeTokens: resolveThemeTokens(themeTokens),
        updatedAt: new Date(),
      })
      .where(eq(siteSettings.siteId, siteId))
      .returning();

    await auditService.log({
      actorId: access.userId,
      action: 'update',
      targetType: 'settings',
      targetId: siteId,
      targetName: 'Site theme',
    });
    revalidatePublicSite();
    return row;
  },

  /** Block manager: hidden blocks per editor type. */
  updateBlockSettings: async (
    input: unknown,
    access: UserAccess
  ): Promise<BlockSettings> => {
    await accessService.assertPermission(
      access.userId,
      PERMISSIONS.SETTINGS_MANAGE
    );
    const siteId = await adminSiteId();
    await loadSettings(siteId);
    const blockSettings = normalizeBlockSettings(input);
    await db
      .update(siteSettings)
      .set({ blockSettings, updatedAt: new Date() })
      .where(eq(siteSettings.siteId, siteId));
    await auditService.log({
      actorId: access.userId,
      action: 'update',
      targetType: 'settings',
      targetId: siteId,
      targetName: 'Site settings (blocks)',
    });
    return blockSettings;
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

  updateLicenseSettings: async (
    input: unknown,
    access: UserAccess
  ): Promise<{ ok: true; data: LicenseSettings } | { ok: false; error: string }> => {
    await accessService.assertPermission(
      access.userId,
      PERMISSIONS.SETTINGS_MANAGE
    );
    const parsed = licenseSettingsSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues.map(i => i.message).join(', ') };
    }
    const siteId = await adminSiteId();
    await loadSettings(siteId);

    await db
      .update(siteSettings)
      .set({
        licenseSettings: parsed.data,
        updatedAt: new Date(),
      })
      .where(eq(siteSettings.siteId, siteId));

    await auditService.log({
      actorId: access.userId,
      action: 'update',
      targetType: 'settings',
      targetId: siteId,
      targetName: 'Site settings (licensing policy)',
    });
    return { ok: true, data: parsed.data };
  },
};

export type SiteSettings = Awaited<ReturnType<typeof siteSettingsService.get>>;
