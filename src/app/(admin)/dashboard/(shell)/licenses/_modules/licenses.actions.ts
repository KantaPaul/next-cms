'use server';

import { PERMISSIONS } from '@/config/permissions';
import { permissionProcedure } from '@/server/procedures/permission.procedure';
import { licenseService } from '@/server/services/license.service';
import { revalidatePath } from 'next/cache';
import {
  issueLicenseActionSchema,
  suspendLicenseActionSchema,
  revokeLicenseActionSchema,
  renewLicenseActionSchema,
  reassignLicenseActionSchema,
  adminDeactivateLicenseActionSchema,
} from './licenses.schemas';

const manage = permissionProcedure(PERMISSIONS.LICENSES_MANAGE);

export const issueLicenseAction = manage
  .input(issueLicenseActionSchema)
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
  .input(suspendLicenseActionSchema)
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
  .input(revokeLicenseActionSchema)
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
  .input(renewLicenseActionSchema)
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
  .input(reassignLicenseActionSchema)
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
  .input(adminDeactivateLicenseActionSchema)
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
