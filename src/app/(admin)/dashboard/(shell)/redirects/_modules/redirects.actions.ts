'use server';

import { revalidatePath } from 'next/cache';
import { PAGES } from '@/config/pages';
import { PERMISSIONS } from '@/config/permissions';
import { permissionProcedure } from '@/server/procedures/permission.procedure';
import { redirectsService } from '@/server/services/redirects.service';
import {
  redirectInputSchema,
  acceptRedirectOfferSchema,
  importRedirectsSchema,
} from './redirects.schemas';

export const createRedirect = permissionProcedure(PERMISSIONS.SETTINGS_MANAGE)
  .input(redirectInputSchema)
  .action(async ({ input }) => {
    const row = await redirectsService.create(input);
    revalidatePath(PAGES.DASHBOARD.REDIRECTS);
    return row;
  });

export const acceptRedirectOffer = permissionProcedure(
  PERMISSIONS.PAGES_PUBLISH
)
  .input(acceptRedirectOfferSchema)
  .action(async ({ input }) => {
    const row = await redirectsService.create({
      fromPath: input.fromPath,
      toPath: input.toPath,
      statusCode: 301,
    });
    revalidatePath(PAGES.DASHBOARD.REDIRECTS);
    return row;
  });

export const importRedirects = permissionProcedure(PERMISSIONS.SETTINGS_MANAGE)
  .input(importRedirectsSchema)
  .action(async ({ input }) => {
    const result = await redirectsService.importCsv(input.csv);
    revalidatePath(PAGES.DASHBOARD.REDIRECTS);
    return result;
  });
