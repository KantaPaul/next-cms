'use server';
import { revalidatePath } from 'next/cache';
import { PAGES } from '@/config/pages';
import { PERMISSIONS } from '@/config/permissions';
import { permissionProcedure } from '@/server/procedures/permission.procedure';
import { siteSettingsService } from '@/server/services/site-settings.service';
import { starterKitService } from '@/server/services/starter-kit.service';
import { parseVideoSettings } from '@/lib/video/settings';
import { db } from '@/db';
import { licenses } from '@/db/schemas/licenses.schema';
import { hashLicenseKey } from '@/lib/license/keys';
import { eq } from 'drizzle-orm';
import { randomBytes } from 'crypto';
import {
  settingsSchema,
  themeFormSchema,
  manageLicenseFormSchema,
  licensePolicyFormSchema,
  installQuietEditorialSchema,
  updateBlockSettingsSchema,
  updateVideoSettingsSchema,
  deactivateManagedLicenseSchema,
  customCodeSchema,
  consentSettingsSchema,
  backupSettingsSchema,
  breakpointsSchema,
} from './settings.schemas';
import { z } from 'zod';

export const updateThemeSettings = permissionProcedure(
  PERMISSIONS.SETTINGS_MANAGE
)
  .input(themeFormSchema)
  .action(async ({ input, ctx }) => {
    const row = await siteSettingsService.updateThemeTokens(
      input.themeTokens,
      ctx.access
    );
    revalidatePath(PAGES.DASHBOARD.THEME);
    revalidatePath(PAGES.DASHBOARD.SETTINGS);
    revalidatePath('/dashboard', 'layout');
    return row;
  });

/** Theme + header, footer, archive, search, post layout and a home page template. */
export const installQuietEditorial = permissionProcedure(
  PERMISSIONS.SETTINGS_MANAGE
)
  .input(installQuietEditorialSchema)
  .action(async ({ ctx }) => {
    const result = await starterKitService.installQuietEditorial(ctx.access);
    revalidatePath(PAGES.DASHBOARD.THEME);
    revalidatePath('/dashboard', 'layout');
    return result;
  });

export const updateSiteSettings = permissionProcedure(
  PERMISSIONS.SETTINGS_MANAGE
)
  .input(settingsSchema)
  .action(async ({ input, ctx }) => {
    const parsedVideoSettings = input.videoSettings
      ? parseVideoSettings(input.videoSettings)
      : undefined;
    const normalizedSearchSettings = input.searchSettings
      ? {
          synonyms: Object.fromEntries(
            input.searchSettings.synonyms.map(item => [
              item.term,
              item.synonyms,
            ])
          ),
          pinnedResults: input.searchSettings.pinnedResults,
        }
      : undefined;
    const row = await siteSettingsService.update(
      {
        ...input,
        videoSettings: parsedVideoSettings?.ok
          ? parsedVideoSettings.data
          : undefined,
        searchSettings: normalizedSearchSettings,
      },
      ctx.access
    );
    revalidatePath(PAGES.DASHBOARD.SETTINGS);
    revalidatePath('/dashboard', 'layout');
    return row;
  });

export const regenerateSiteModeBypassToken = permissionProcedure(
  PERMISSIONS.SETTINGS_MANAGE
)
  .input(z.object({}).optional())
  .action(async ({ ctx }) => {
    const nextSiteMode = await siteSettingsService.regenerateSiteModeBypassToken(
      ctx.access
    );
    revalidatePath(PAGES.DASHBOARD.SETTINGS);
    return nextSiteMode;
  });

export const updateConsentSettings = permissionProcedure(
  PERMISSIONS.SETTINGS_MANAGE
)
  .input(consentSettingsSchema)
  .action(async ({ input, ctx }) => {
    const row = await siteSettingsService.updateConsent(input, ctx.access);
    revalidatePath(PAGES.DASHBOARD.SETTINGS_CONSENT);
    revalidatePath(PAGES.DASHBOARD.SETTINGS);
    revalidatePath('/', 'layout');
    return row;
  });

export const updateBackupSettingsAction = permissionProcedure(
  PERMISSIONS.SETTINGS_MANAGE
)
  .input(backupSettingsSchema)
  .action(async ({ input, ctx }) => {
    const row = await siteSettingsService.updateBackupSettings(input, ctx.access);
    revalidatePath(PAGES.DASHBOARD.TOOLS_BACKUPS);
    return row;
  });

export const updateBlockSettings = permissionProcedure(
  PERMISSIONS.SETTINGS_MANAGE
)
  .input(updateBlockSettingsSchema)
  .action(async ({ input, ctx }) => {
    const data = await siteSettingsService.updateBlockSettings(
      input,
      ctx.access
    );
    revalidatePath(PAGES.DASHBOARD.SETTINGS_BLOCKS);
    return { ok: true, data };
  });

export const updateVideoSettings = permissionProcedure(
  PERMISSIONS.SETTINGS_MANAGE
)
  .input(updateVideoSettingsSchema)
  .action(async ({ input, ctx }) => {
    const result = await siteSettingsService.updateVideoSettings(
      input,
      ctx.access
    );
    if (!result.ok) {
      return { ok: false, error: result.error };
    }
    revalidatePath(PAGES.DASHBOARD.SETTINGS);
    return { ok: true, data: result.data };
  });

export const updateManagedLicense = permissionProcedure(
  PERMISSIONS.SETTINGS_MANAGE
)
  .input(manageLicenseFormSchema)
  .action(async ({ input, ctx }) => {
    const rawKey = input.licenseKey.trim();
    const siteSettings = await siteSettingsService.get();
    const current = siteSettings.licenseSettings;

    const keyHash = hashLicenseKey(rawKey);
    const [existingLicense] = await db
      .select()
      .from(licenses)
      .where(eq(licenses.keyHash, keyHash))
      .limit(1);

    const now = new Date();
    let status: 'active' | 'pending' | 'expired' | 'revoked' | 'inactive' =
      'active';
    let expiresAt: string | null = null;
    const installationId =
      current.managedInstallationPublicId ||
      `inst_${randomBytes(8).toString('hex')}`;

    if (existingLicense) {
      if (
        existingLicense.status === 'revoked' ||
        existingLicense.status === 'suspended'
      ) {
        return {
          ok: false,
          error: `License cannot be activated: Status is ${existingLicense.status}`,
        };
      }
      if (existingLicense.expiresAt && existingLicense.expiresAt < now) {
        return {
          ok: false,
          error: 'This license key has expired',
        };
      }
      status = 'active';
      expiresAt = existingLicense.expiresAt
        ? existingLicense.expiresAt.toISOString()
        : null;

      if (existingLicense.status === 'pending') {
        await db
          .update(licenses)
          .set({ status: 'active', activatedAt: now, updatedAt: now })
          .where(eq(licenses.id, existingLicense.id));
      }
    } else {
      if (!rawKey.startsWith('ncms_lic_')) {
        return {
          ok: false,
          error: 'Invalid license key format. Keys start with ncms_lic_',
        };
      }
      status = 'active';
      const expiryDays = current.defaultExpiryDays || 365;
      expiresAt = new Date(
        now.getTime() + expiryDays * 86400 * 1000
      ).toISOString();
    }

    const updatedSettings = {
      ...current,
      managedLicenseKey: rawKey,
      authorityUrl: input.authorityUrl || null,
      managedLicenseStatus: status,
      managedLicenseActivatedAt: now.toISOString(),
      managedLicenseExpiresAt: expiresAt,
      managedInstallationPublicId: installationId,
      managedLastCheckedAt: now.toISOString(),
    };

    const res = await siteSettingsService.updateLicenseSettings(
      updatedSettings,
      ctx.access
    );
    if (!res.ok) {
      return { ok: false, error: res.error };
    }

    revalidatePath(PAGES.DASHBOARD.SETTINGS_LICENSE);
    revalidatePath(PAGES.DASHBOARD.SETTINGS);
    return { ok: true, data: updatedSettings };
  });

export const deactivateManagedLicense = permissionProcedure(
  PERMISSIONS.SETTINGS_MANAGE
)
  .input(deactivateManagedLicenseSchema)
  .action(async ({ ctx }) => {
    const siteSettings = await siteSettingsService.get();
    const current = siteSettings.licenseSettings;

    const updatedSettings = {
      ...current,
      managedLicenseStatus: 'inactive' as const,
      managedLastCheckedAt: new Date().toISOString(),
    };

    const res = await siteSettingsService.updateLicenseSettings(
      updatedSettings,
      ctx.access
    );
    if (!res.ok) {
      return { ok: false, error: res.error };
    }

    revalidatePath(PAGES.DASHBOARD.SETTINGS_LICENSE);
    revalidatePath(PAGES.DASHBOARD.SETTINGS);
    return { ok: true, data: updatedSettings };
  });

export const updateLicensePolicy = permissionProcedure(
  PERMISSIONS.SETTINGS_MANAGE
)
  .input(licensePolicyFormSchema)
  .action(async ({ input, ctx }) => {
    const siteSettings = await siteSettingsService.get();
    const current = siteSettings.licenseSettings;

    const updatedSettings = {
      ...current,
      ...input,
    };

    const res = await siteSettingsService.updateLicenseSettings(
      updatedSettings,
      ctx.access
    );
    if (!res.ok) {
      return { ok: false, error: res.error };
    }

    revalidatePath(PAGES.DASHBOARD.SETTINGS_LICENSE);
    revalidatePath(PAGES.DASHBOARD.SETTINGS);
    return { ok: true, data: updatedSettings };
  });

export const updateCustomCode = permissionProcedure(
  PERMISSIONS.SETTINGS_MANAGE
)
  .input(customCodeSchema)
  .action(async ({ input, ctx }) => {
    const current = await siteSettingsService.get();
    const row = await siteSettingsService.update(
      {
        siteName: current.siteName,
        customCode: input,
      },
      ctx.access
    );
    revalidatePath(PAGES.DASHBOARD.SETTINGS);
    revalidatePath('/dashboard/settings/custom-code');
    revalidatePath('/', 'layout');
    return row;
  });

export const updateCustomFonts = permissionProcedure(
  PERMISSIONS.SETTINGS_MANAGE
)
  .input(
    z.object({
      customFonts: z.array(
        z.object({
          family: z.string().trim().min(1).max(100),
          weights: z.array(
            z.object({
              weight: z.string().max(20),
              style: z.string().max(20).optional(),
              mediaKey: z.string().max(500),
            })
          ),
        })
      ),
    })
  )
  .action(async ({ input, ctx }) => {
    const current = await siteSettingsService.get();
    const row = await siteSettingsService.update(
      {
        siteName: current.siteName,
        customFonts: input.customFonts,
      },
      ctx.access
    );
    revalidatePath(PAGES.DASHBOARD.THEME);
    revalidatePath('/', 'layout');
    return row;
  });

export const updateBreakpoints = permissionProcedure(
  PERMISSIONS.SETTINGS_MANAGE
)
  .input(z.object({ breakpoints: breakpointsSchema }))
  .action(async ({ input, ctx }) => {
    const res = await siteSettingsService.updateBreakpoints(
      input.breakpoints,
      ctx.access
    );
    if (!res.ok) {
      return { ok: false, error: res.error };
    }
    revalidatePath(PAGES.DASHBOARD.SETTINGS_BREAKPOINTS);
    revalidatePath(PAGES.DASHBOARD.SETTINGS);
    revalidatePath('/', 'layout');
    return { ok: true, data: res.data };
  });
