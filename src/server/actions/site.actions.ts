'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { PAGES } from '@/config/pages';
import { PERMISSIONS } from '@/config/permissions';
import { DEFAULT_SITE_LOCALES } from '@/db/schemas/sites.schema';
import { getCurrentUserAndTeamId } from '@/lib/auth';
import { permissionProcedure } from '@/server/procedures/permission.procedure';
import { SITE_COOKIE, siteContext } from '@/server/services/site-context';
import { sitesService } from '@/server/services/sites.service';

export async function switchSite(siteId: string) {
  const { userId } = await getCurrentUserAndTeamId();
  const memberships = await siteContext.memberships(userId);
  if (!memberships.some(row => row.siteId === siteId)) return;
  const jar = await cookies();
  jar.set(SITE_COOKIE, siteId, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: process.env.NODE_ENV === 'production',
  });
  revalidatePath(PAGES.DASHBOARD.ROOT, 'layout');
}

const locale = z.object({
  code: z.string().trim().min(2).max(12),
  label: z.string().trim().min(1).max(40),
});

export const createSite = permissionProcedure(PERMISSIONS.SETTINGS_MANAGE)
  .input(
    z.object({
      name: z.string().trim().min(1).max(120),
      primaryHost: z.string().trim().max(255).nullish(),
      extraDomains: z.string().trim().max(1000).nullish(),
      defaultLocale: z.string().trim().min(2).max(12),
      locales: z.array(locale).min(1),
    })
  )
  .action(async ({ input, ctx }) => {
    const site = await sitesService.create(
      {
        name: input.name,
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
