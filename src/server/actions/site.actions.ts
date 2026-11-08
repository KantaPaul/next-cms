'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { PAGES } from '@/config/pages';
import { PERMISSIONS } from '@/config/permissions';
import { DEFAULT_SITE_LOCALES } from '@/db/schemas/sites.schema';
import { getCurrentUserAndTeamId } from '@/lib/auth';
import { permissionProcedure } from '@/server/procedures/permission.procedure';
import { SITE_COOKIE, siteContext } from '@/server/services/site-context';
import { sitesService } from '@/server/services/sites.service';
import { revalidatePublicSite } from '@/lib/utils/revalidate-site';
import {
  createSiteSchema,
  updateSiteSchema,
} from '@/app/(admin)/dashboard/(shell)/sites/_modules/sites.schemas';

export async function switchSite(siteId: string) {
  const { userId } = await getCurrentUserAndTeamId();
  const memberships = await siteContext.memberships(userId);
  if (!memberships.some(row => row.siteId === siteId)) return;
  // Clear cached admin site context for this user by revalidating layout
  const jar = await cookies();
  jar.set(SITE_COOKIE, siteId, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: process.env.NODE_ENV === 'production',
  });
  revalidatePath(PAGES.DASHBOARD.ROOT, 'layout');
}

export const createSite = permissionProcedure(PERMISSIONS.SETTINGS_MANAGE)
  .input(createSiteSchema)
  .action(async ({ input, ctx }) => {
    const site = await sitesService.create(
      {
        name: input.name,
        slug: input.slug || undefined,
        primaryHost: input.primaryHost,
        extraDomains: input.extraDomains,
        defaultLocale: input.defaultLocale,
        locales: input.locales.length ? input.locales : DEFAULT_SITE_LOCALES,
      },
      ctx.access
    );
    if (site) {
      const jar = await cookies();
      jar.set(SITE_COOKIE, site.id, {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      });
    }
    revalidatePath(PAGES.DASHBOARD.ROOT, 'layout');
    return site;
  });

export const updateSite = permissionProcedure(PERMISSIONS.SETTINGS_MANAGE)
  .input(updateSiteSchema)
  .action(async ({ input, ctx }) => {
    const site = await sitesService.update(
      input.siteId,
      {
        name: input.name,
        slug: input.slug || undefined,
        primaryHost: input.primaryHost,
        extraDomains: input.extraDomains,
        defaultLocale: input.defaultLocale,
        locales: input.locales.length ? input.locales : DEFAULT_SITE_LOCALES,
      },
      ctx.access
    );
    revalidatePath(PAGES.DASHBOARD.ROOT, 'layout');
    revalidatePath(PAGES.DASHBOARD.SITES);
    revalidatePublicSite();
    return site;
  });
