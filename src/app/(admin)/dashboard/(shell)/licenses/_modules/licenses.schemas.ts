import { z } from 'zod';

export const issueLicenseActionSchema = z.object({
  ownerUserId: z.string().optional().nullable(),
  expiresInDays: z.number().int().min(1).optional(),
});

export const suspendLicenseActionSchema = z.object({
  licenseId: z.string().min(1),
  reason: z.string().optional(),
});

export const revokeLicenseActionSchema = z.object({
  licenseId: z.string().min(1),
  reason: z.string().optional(),
});

export const renewLicenseActionSchema = z.object({
  licenseId: z.string().min(1),
  daysToAdd: z.number().int().min(1).default(365),
});

export const reassignLicenseActionSchema = z.object({
  licenseId: z.string().min(1),
  newPublicKey: z.string().min(10),
  reason: z.string().min(1),
});

export const adminDeactivateLicenseActionSchema = z.object({
  licenseId: z.string().min(1),
  reason: z.string().optional(),
});

/** Issue-license dialog form (stricter than the action: validity is required). */
export const issueLicenseFormSchema = z.object({
  ownerUserId: z.string().optional(),
  expiresInDays: z
    .number({ message: 'Validity period must be a number' })
    .int('Must be a whole number of days')
    .min(1, 'Validity period must be at least 1 day'),
});

export type IssueLicenseFormValues = z.infer<typeof issueLicenseFormSchema>;
