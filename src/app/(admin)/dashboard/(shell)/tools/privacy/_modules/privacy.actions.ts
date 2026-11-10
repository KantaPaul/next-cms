'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { PAGES } from '@/config/pages';
import { PERMISSIONS } from '@/config/permissions';
import { env } from '@/env.mjs';
import { permissionProcedure } from '@/server/procedures/permission.procedure';
import { privacyService } from '@/server/services/privacy.service';
import { adminSiteId } from '@/server/services/site-context';
import { siteSettingsService } from '@/server/services/site-settings.service';

export const lookupPrivacyDataAction = permissionProcedure(
  PERMISSIONS.SETTINGS_MANAGE
)
  .input(
    z.object({
      email: z.string().trim().email('Enter a valid email').max(200),
      visitorId: z.string().trim().max(100).nullish(),
    })
  )
  .action(async ({ input }) => {
    const siteId = await adminSiteId();
    return privacyService.findDataForEmail({
      siteId,
      email: input.email,
      visitorId: input.visitorId ?? null,
    });
  });

export const erasePrivacyDataAction = permissionProcedure(
  PERMISSIONS.SETTINGS_MANAGE
)
  .input(
    z.object({
      email: z.string().trim().email().max(200),
      visitorId: z.string().trim().max(100).nullish(),
      requestId: z.string().trim().max(100).nullish(),
      commentMode: z.enum(['anonymize', 'delete']).default('anonymize'),
    })
  )
  .action(async ({ input, ctx }) => {
    const siteId = await adminSiteId();
    const res = await privacyService.eraseData({
      siteId,
      email: input.email,
      visitorId: input.visitorId ?? null,
      requestId: input.requestId ?? null,
      commentMode: input.commentMode,
      access: ctx.access,
    });
    revalidatePath(PAGES.DASHBOARD.TOOLS_PRIVACY);
    return res;
  });

export const emailPrivacyExportLinkAction = permissionProcedure(
  PERMISSIONS.SETTINGS_MANAGE
)
  .input(
    z.object({
      requestId: z.string().trim().min(1).max(100),
    })
  )
  .action(async ({ input, ctx }) => {
    const siteId = await adminSiteId();
    const settings = await siteSettingsService.get();
    const baseUrl = settings.siteUrl?.trim() || env.SITE_URL;
    const res = await privacyService.emailOneTimeExportLink({
      siteId,
      siteName: settings.siteName,
      requestId: input.requestId,
      baseUrl,
      access: ctx.access,
    });
    revalidatePath(PAGES.DASHBOARD.TOOLS_PRIVACY);
    return res;
  });

export const rejectPrivacyRequestAction = permissionProcedure(
  PERMISSIONS.SETTINGS_MANAGE
)
  .input(
    z.object({
      requestId: z.string().trim().min(1).max(100),
      notes: z.string().trim().max(500).optional(),
    })
  )
  .action(async ({ input, ctx }) => {
    const siteId = await adminSiteId();
    const res = await privacyService.rejectRequest({
      siteId,
      requestId: input.requestId,
      notes: input.notes,
      access: ctx.access,
    });
    revalidatePath(PAGES.DASHBOARD.TOOLS_PRIVACY);
    return res;
  });
