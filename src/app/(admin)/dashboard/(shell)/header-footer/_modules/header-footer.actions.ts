'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { PAGES } from '@/config/pages';
import { accessProcedure } from '@/server/procedures/permission.procedure';
import { revalidatePublicSite } from '@/lib/utils/revalidate-site';
import { adminSiteId } from '@/server/services/site-context';
import { headerFooterService } from './header-footer.service';

export const createHeaderFooter = accessProcedure
  .input(
    z.object({
      name: z.string().trim().min(1).max(150),
      category: z.enum(['Header', 'Footer']),
      starter: z.string().optional(),
    })
  )
  .action(async ({ input, ctx }) => {
    const row = await headerFooterService.create(input, ctx.access);
    const siteId = await adminSiteId();
    revalidatePath(PAGES.DASHBOARD.HEADER_FOOTER);
    revalidatePath(PAGES.DASHBOARD.TEMPLATES);
    await revalidatePublicSite(siteId);
    return row;
  });

export const duplicateHeaderFooter = accessProcedure
  .input(
    z.object({
      id: z.string().min(1),
    })
  )
  .action(async ({ input, ctx }) => {
    const row = await headerFooterService.duplicate(input, ctx.access);
    const siteId = await adminSiteId();
    revalidatePath(PAGES.DASHBOARD.HEADER_FOOTER);
    revalidatePath(PAGES.DASHBOARD.TEMPLATES);
    await revalidatePublicSite(siteId);
    return row;
  });

export const renameHeaderFooter = accessProcedure
  .input(
    z.object({
      id: z.string().min(1),
      name: z.string().trim().min(1).max(150),
    })
  )
  .action(async ({ input, ctx }) => {
    const row = await headerFooterService.rename(input, ctx.access);
    const siteId = await adminSiteId();
    revalidatePath(PAGES.DASHBOARD.HEADER_FOOTER);
    revalidatePath(PAGES.DASHBOARD.TEMPLATES);
    await revalidatePublicSite(siteId);
    return row;
  });

export const deleteHeaderFooter = accessProcedure
  .input(
    z.object({
      id: z.string().min(1),
    })
  )
  .action(async ({ input, ctx }) => {
    const row = await headerFooterService.delete(input, ctx.access);
    const siteId = await adminSiteId();
    revalidatePath(PAGES.DASHBOARD.HEADER_FOOTER);
    revalidatePath(PAGES.DASHBOARD.TEMPLATES);
    await revalidatePublicSite(siteId);
    return row;
  });
