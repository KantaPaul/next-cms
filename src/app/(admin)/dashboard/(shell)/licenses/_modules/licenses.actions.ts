'use server';

import { PERMISSIONS } from '@/config/permissions';
import { permissionProcedure } from '@/server/procedures/permission.procedure';
import { licenseService } from '@/server/services/license.service';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';

const manage = permissionProcedure(PERMISSIONS.LICENSES_MANAGE);

export const issueLicenseAction = manage
  .input(
    z.object({
      ownerUserId: z.string().optional().nullable(),
      expiresInDays: z.number().int().min(1).optional(),
    })
  )
  .action(async ({ input, ctx }) => {
    const result = await licenseService.issueLicense({
      ownerUserId: input.ownerUserId,
      expiresInDays: input.expiresInDays,
      actorId: ctx.user.userId,
    });
    revalidatePath('/dashboard/licenses');
    return result;
  });

export const suspendLicenseAction = manage
  .input(
    z.object({
      licenseId: z.string().min(1),
      reason: z.string().optional(),
    })
  )
  .action(async ({ input, ctx }) => {
    const result = await licenseService.suspendLicense(
      input.licenseId,
      ctx.user.userId,
      input.reason
    );
    revalidatePath('/dashboard/licenses');
    revalidatePath(`/dashboard/licenses/${input.licenseId}`);
    return result;
  });

export const revokeLicenseAction = manage
  .input(
    z.object({
      licenseId: z.string().min(1),
      reason: z.string().optional(),
    })
  )
  .action(async ({ input, ctx }) => {
    const result = await licenseService.revokeLicense(
      input.licenseId,
      ctx.user.userId,
      input.reason
    );
    revalidatePath('/dashboard/licenses');
    revalidatePath(`/dashboard/licenses/${input.licenseId}`);
    return result;
  });

export const renewLicenseAction = manage
  .input(
    z.object({
      licenseId: z.string().min(1),
      daysToAdd: z.number().int().min(1).default(365),
    })
  )
  .action(async ({ input, ctx }) => {
    const result = await licenseService.renewLicense(
      input.licenseId,
      input.daysToAdd,
      ctx.user.userId
    );
    revalidatePath('/dashboard/licenses');
    revalidatePath(`/dashboard/licenses/${input.licenseId}`);
    return result;
  });

export const reassignLicenseAction = manage
  .input(
    z.object({
      licenseId: z.string().min(1),
      newPublicKey: z.string().min(10),
      reason: z.string().min(1),
    })
  )
  .action(async ({ input, ctx }) => {
    const result = await licenseService.reassignLicense({
      licenseId: input.licenseId,
      newPublicKey: input.newPublicKey,
      reason: input.reason,
      actorId: ctx.user.userId,
    });
    if (!result.ok) {
      throw new Error(result.error);
    }
    revalidatePath('/dashboard/licenses');
    revalidatePath(`/dashboard/licenses/${input.licenseId}`);
    return result;
  });

export const adminDeactivateLicenseAction = manage
  .input(
    z.object({
      licenseId: z.string().min(1),
      reason: z.string().optional(),
    })
  )
  .action(async ({ input, ctx }) => {
    const result = await licenseService.adminDeactivateInstallation(
      input.licenseId,
      ctx.user.userId,
      input.reason
    );
    revalidatePath('/dashboard/licenses');
    revalidatePath(`/dashboard/licenses/${input.licenseId}`);
    return result;
  });
