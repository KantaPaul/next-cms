'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { PAGES } from '@/config/pages';
import { PERMISSIONS } from '@/config/permissions';
import type {
  ExternalApiDataFilter,
  ExternalApiFieldMapping,
} from '@/lib/external-api-schema';
import { permissionProcedure } from '@/server/procedures/permission.procedure';
import { externalApisService } from '@/server/services/external-apis.service';
import { adminSiteId, siteContext } from '@/server/services/site-context';

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
  fields: z.array(z.any()).default([]),
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

export const listExternalApisAction = permissionProcedure(PERMISSIONS.PAGES_EDIT)
  .input(z.object({}).optional())
  .action(async () => {
    return externalApisService.list();
  });

export const getExternalApiAction = permissionProcedure(PERMISSIONS.PAGES_EDIT)
  .input(z.object({ id: z.string().min(1) }))
  .action(async ({ input }) => {
    return externalApisService.getById(input.id);
  });

export const createExternalApiAction = permissionProcedure(
  PERMISSIONS.PAGES_EDIT
)
  .input(externalApiInputSchema)
  .action(async ({ input }) => {
    const created = await externalApisService.create({
      ...input,
      fields: input.fields as ExternalApiFieldMapping[],
      dataFilters: input.dataFilters as ExternalApiDataFilter[],
    });
    revalidatePath(PAGES.DASHBOARD.EXTERNAL_API);
    return created;
  });

export const updateExternalApiAction = permissionProcedure(
  PERMISSIONS.PAGES_EDIT
)
  .input(externalApiInputSchema.extend({ id: z.string().min(1) }))
  .action(async ({ input }) => {
    const { id, ...rest } = input;
    const updated = await externalApisService.update(id, {
      ...rest,
      fields: rest.fields as ExternalApiFieldMapping[],
      dataFilters: rest.dataFilters as ExternalApiDataFilter[],
    });
    revalidatePath(PAGES.DASHBOARD.EXTERNAL_API);
    return updated;
  });

export const deleteExternalApiAction = permissionProcedure(
  PERMISSIONS.PAGES_EDIT
)
  .input(z.object({ id: z.string().min(1) }))
  .action(async ({ input }) => {
    await externalApisService.remove(input.id);
    revalidatePath(PAGES.DASHBOARD.EXTERNAL_API);
    return { ok: true };
  });

/**
 * Loads a saved External API preset for block rendering (`loadQueryLoop`).
 * Safe to call from both public pages and the builder editor.
 */
export async function getExternalApiPresetForRender(
  id: string,
  isEditorOrPreview = false
) {
  if (!id) return null;
  const siteId = isEditorOrPreview
    ? await adminSiteId()
    : (await siteContext.publicSite()).id;
  return externalApisService.getById(id, siteId);
}
