'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { PAGES } from '@/config/pages';
import { PERMISSIONS } from '@/config/permissions';
import {
  EXTERNAL_API_FIELD_TYPES,
  type ExternalApiDataFilter,
  type ExternalApiFieldMapping,
} from '@/lib/external-api-schema';
import { permissionProcedure } from '@/server/procedures/permission.procedure';
import { auditService } from '@/server/services/audit.service';
import { externalApisService } from '@/server/services/external-apis.service';

/**
 * Field mappings keep their many optional display props (`passthrough`), but
 * the parts the renderer relies on are checked and the sizes are bounded.
 */
const nestedFieldMappingSchema = z
  .object({
    key: z.string().max(255),
    fieldType: z.enum(EXTERNAL_API_FIELD_TYPES).exclude(['array']),
  })
  .passthrough();

const fieldMappingSchema = z
  .object({
    key: z.string().max(255),
    fieldType: z.enum(EXTERNAL_API_FIELD_TYPES),
    nestedFields: z.array(nestedFieldMappingSchema).max(100).optional(),
  })
  .passthrough();

/** Endpoint origin + path for the audit log; query strings may hold keys. */
function endpointForAudit(url: string): string {
  try {
    const u = new URL(url);
    return `${u.origin}${u.pathname}`;
  } catch {
    return '';
  }
}

const externalApiInputSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(160),
  description: z.string().trim().max(1000).optional().nullable(),
  endpointUrl: z
    .string()
    .trim()
    .url('Enter a valid http(s):// API Endpoint URL')
    .max(1000),
  method: z.enum(['GET', 'POST']).default('GET'),
  headers: z.record(z.string(), z.string()).default({}),
  secrets: z.record(z.string(), z.string()).default({}),
  body: z.string().optional().nullable(),
  itemsPath: z.string().trim().max(255).default(''),
  totalPath: z.string().trim().max(255).optional().nullable(),
  selectedItemId: z.string().trim().max(255).optional().nullable(),
  filterToSelectedItem: z.boolean().default(true),
  fieldId: z.string().trim().max(255).default('id'),
  fieldTitle: z.string().trim().max(255).default('title'),
  fieldUrl: z.string().trim().max(255).optional().nullable(),
  fieldExcerpt: z.string().trim().max(255).optional().nullable(),
  fieldImage: z.string().trim().max(255).optional().nullable(),
  fieldPublishedAt: z.string().trim().max(255).optional().nullable(),
  fields: z.array(fieldMappingSchema).max(200).default([]),
  queryParams: z.record(z.string(), z.string()).default({}),
  dataFilters: z
    .array(
      z.object({
        key: z.string(),
        operator: z.enum([
          'equals',
          'not_equals',
          'contains',
          'not_contains',
          'starts_with',
          'gt',
          'lt',
          'in',
          'not_empty',
        ]),
        value: z.string().optional(),
      })
    )
    .default([]),
  cacheTtlSeconds: z.number().int().min(0).max(3600).default(60),
  timeoutMs: z.number().int().min(500).max(10000).default(4000),
});

export const listExternalApisAction = permissionProcedure(
  PERMISSIONS.EXTERNAL_API_MANAGE
)
  .input(z.object({}).optional())
  .action(async () => {
    return externalApisService.list();
  });

export const getExternalApiAction = permissionProcedure(
  PERMISSIONS.EXTERNAL_API_MANAGE
)
  .input(z.object({ id: z.string().min(1) }))
  .action(async ({ input }) => {
    return externalApisService.getById(input.id);
  });

export const createExternalApiAction = permissionProcedure(
  PERMISSIONS.EXTERNAL_API_MANAGE
)
  .input(externalApiInputSchema)
  .action(async ({ input, ctx }) => {
    const created = await externalApisService.create({
      ...input,
      fields: input.fields as unknown as ExternalApiFieldMapping[],
      dataFilters: input.dataFilters as ExternalApiDataFilter[],
    });
    await auditService.log({
      actorId: ctx.user.userId,
      action: 'create',
      targetType: 'external_api',
      targetId: created.id,
      targetName: created.name,
      details: endpointForAudit(created.endpointUrl),
    });
    revalidatePath(PAGES.DASHBOARD.EXTERNAL_API);
    return created;
  });

export const updateExternalApiAction = permissionProcedure(
  PERMISSIONS.EXTERNAL_API_MANAGE
)
  .input(externalApiInputSchema.extend({ id: z.string().min(1) }))
  .action(async ({ input, ctx }) => {
    const { id, ...rest } = input;
    const updated = await externalApisService.update(id, {
      ...rest,
      fields: rest.fields as unknown as ExternalApiFieldMapping[],
      dataFilters: rest.dataFilters as ExternalApiDataFilter[],
    });
    // Never log header or secret values, only that the record changed.
    await auditService.log({
      actorId: ctx.user.userId,
      action: 'update',
      targetType: 'external_api',
      targetId: updated.id,
      targetName: updated.name,
      details: endpointForAudit(updated.endpointUrl),
    });
    revalidatePath(PAGES.DASHBOARD.EXTERNAL_API);
    return updated;
  });

export const deleteExternalApiAction = permissionProcedure(
  PERMISSIONS.EXTERNAL_API_MANAGE
)
  .input(z.object({ id: z.string().min(1) }))
  .action(async ({ input, ctx }) => {
    const existing = await externalApisService.getById(input.id);
    await externalApisService.remove(input.id);
    await auditService.log({
      actorId: ctx.user.userId,
      action: 'delete',
      targetType: 'external_api',
      targetId: input.id,
      targetName: existing?.name ?? null,
      details: existing ? endpointForAudit(existing.endpointUrl) : null,
    });
    revalidatePath(PAGES.DASHBOARD.EXTERNAL_API);
    return { ok: true };
  });
