'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { PAGES } from '@/config/pages';
import { PERMISSIONS } from '@/config/permissions';
import { permissionProcedure } from '@/server/procedures/permission.procedure';
import { redirectsService } from '@/server/services/redirects.service';

const redirectInput = z.object({
  fromPath: z.string().min(1),
  toPath: z.string().min(1),
  statusCode: z.union([z.literal(301), z.literal(302)]).optional(),
});

export const createRedirect = permissionProcedure(PERMISSIONS.SETTINGS_MANAGE)
  .input(redirectInput)
  .action(async ({ input }) => {
    const row = await redirectsService.create(input);
    revalidatePath(PAGES.DASHBOARD.REDIRECTS);
    return row;
  });

export const acceptRedirectOffer = permissionProcedure(PERMISSIONS.PAGES_PUBLISH)
  .input(z.object({ fromPath: z.string().min(1), toPath: z.string().min(1) }))
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
  .input(z.object({ csv: z.string().min(1) }))
  .action(async ({ input }) => {
    const result = await redirectsService.importCsv(input.csv);
    revalidatePath(PAGES.DASHBOARD.REDIRECTS);
    return result;
  });
