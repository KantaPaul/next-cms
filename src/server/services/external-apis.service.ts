import 'server-only';
import { and, desc, eq } from 'drizzle-orm';
import { db } from '@/db';
import {
  type ExternalApiRecord,
  externalApis,
} from '@/db/schemas/external-apis.schema';
import type {
  ExternalApiDataFilter,
  ExternalApiFieldMapping,
} from '@/lib/external-api-schema';
import { ApplicationException } from '@/lib/utils/error';
import {
  decryptHeadersForRuntime,
  decryptSecretMap,
  encryptHeadersForStorage,
  encryptSecretMap,
  maskHeadersForDisplay,
  maskSecretMap,
} from '@/server/lib/external-api-secrets';
import { adminSiteId, siteContext } from '@/server/services/site-context';

export interface ExternalApiUpsertInput {
  name: string;
  description?: string | null;
  endpointUrl: string;
  method: 'GET' | 'POST';
  headers?: Record<string, string>;
  secrets?: Record<string, string>;
  body?: string | null;
  itemsPath?: string;
  totalPath?: string | null;
  selectedItemId?: string | null;
  filterToSelectedItem?: boolean;
  fieldId?: string;
  fieldTitle?: string;
  fieldUrl?: string | null;
  fieldExcerpt?: string | null;
  fieldImage?: string | null;
  fieldPublishedAt?: string | null;
  fields?: ExternalApiFieldMapping[];
  queryParams?: Record<string, string>;
  dataFilters?: ExternalApiDataFilter[];
  cacheTtlSeconds?: number;
  timeoutMs?: number;
}

function maskExternalApiRecord(row: ExternalApiRecord): ExternalApiRecord {
  return {
    ...row,
    headers: maskHeadersForDisplay(row.headers ?? {}),
    secrets: maskSecretMap(row.secrets ?? {}),
  };
}

/**
 * The listing service's `apiConfig` for a saved preset (decrypted runtime
 * record from `getByIdForRuntime`).
 */
export function presetToApiConfig(preset: ExternalApiRecord) {
  return {
    endpointUrl: preset.endpointUrl,
    method: preset.method === 'POST' ? ('POST' as const) : ('GET' as const),
    headers: preset.headers ?? {},
    queryParams: preset.queryParams ?? {},
    dataFilters: preset.dataFilters ?? [],
    ...(preset.body ? { body: preset.body } : {}),
    itemsPath: preset.itemsPath ?? '',
    ...(preset.totalPath ? { totalPath: preset.totalPath } : {}),
    fieldMap: {
      id: preset.fieldId || 'id',
      title: preset.fieldTitle || 'title',
      ...(preset.fieldUrl ? { url: preset.fieldUrl } : {}),
      ...(preset.fieldExcerpt ? { excerpt: preset.fieldExcerpt } : {}),
      ...(preset.fieldImage ? { image: preset.fieldImage } : {}),
      ...(preset.fieldPublishedAt ? { publishedAt: preset.fieldPublishedAt } : {}),
    },
    fields: preset.fields ?? [],
    cacheTtlSeconds: preset.cacheTtlSeconds ?? 60,
    timeoutMs: preset.timeoutMs ?? 4000,
  };
}

export const externalApisService = {
  list: async (siteId?: string): Promise<ExternalApiRecord[]> => {
    const resolvedSiteId = siteId ?? (await adminSiteId());
    const rows = await db
      .select()
      .from(externalApis)
      .where(eq(externalApis.siteId, resolvedSiteId))
      .orderBy(desc(externalApis.updatedAt), desc(externalApis.createdAt));
    return rows.map(maskExternalApiRecord);
  },

  getById: async (
    id: string,
    siteId?: string
  ): Promise<ExternalApiRecord | null> => {
    const resolvedSiteId = siteId ?? (await adminSiteId());
    const [row] = await db
      .select()
      .from(externalApis)
      .where(
        and(eq(externalApis.id, id), eq(externalApis.siteId, resolvedSiteId))
      )
      .limit(1);
    return row ? maskExternalApiRecord(row) : null;
  },

  /**
   * Server-only: returns decrypted headers & vault secrets for outbound API
   * execution. Never expose this directly to client components.
   */
  getByIdForRuntime: async (
    id: string,
    siteId?: string
  ): Promise<ExternalApiRecord | null> => {
    const resolvedSiteId = siteId ?? (await adminSiteId());
    const [row] = await db
      .select()
      .from(externalApis)
      .where(
        and(eq(externalApis.id, id), eq(externalApis.siteId, resolvedSiteId))
      )
      .limit(1);
    if (!row) return null;
    return {
      ...row,
      headers: decryptHeadersForRuntime(row.headers ?? {}),
      secrets: decryptSecretMap(row.secrets ?? {}),
    };
  },

  /**
   * Loads a saved External API preset with decrypted secrets for server-side
   * block rendering (`loadQueryLoop` / `loadQueryFilter`).
   */
  getPresetForRender: async (
    id: string,
    isEditorOrPreview = false
  ): Promise<ExternalApiRecord | null> => {
    if (!id) return null;
    const siteId = isEditorOrPreview
      ? await adminSiteId()
      : (await siteContext.publicSite()).id;
    return externalApisService.getByIdForRuntime(id, siteId);
  },

  create: async (
    input: ExternalApiUpsertInput,
    siteId?: string
  ): Promise<ExternalApiRecord> => {
    const resolvedSiteId = siteId ?? (await adminSiteId());
    const [created] = await db
      .insert(externalApis)
      .values({
        siteId: resolvedSiteId,
        name: input.name.trim(),
        description: input.description?.trim() || null,
        endpointUrl: input.endpointUrl.trim(),
        method: input.method === 'POST' ? 'POST' : 'GET',
        headers: encryptHeadersForStorage(input.headers ?? {}),
        secrets: encryptSecretMap(input.secrets ?? {}),
        body: input.body ?? null,
        itemsPath: input.itemsPath?.trim() ?? '',
        totalPath: input.totalPath?.trim() || null,
        selectedItemId: input.selectedItemId?.trim() || null,
        filterToSelectedItem: input.filterToSelectedItem ?? true,
        fieldId: input.fieldId?.trim() || 'id',
        fieldTitle: input.fieldTitle?.trim() || 'title',
        fieldUrl: input.fieldUrl?.trim() || null,
        fieldExcerpt: input.fieldExcerpt?.trim() || null,
        fieldImage: input.fieldImage?.trim() || null,
        fieldPublishedAt: input.fieldPublishedAt?.trim() || null,
        fields: Array.isArray(input.fields) ? input.fields : [],
        queryParams: input.queryParams ?? {},
        dataFilters: Array.isArray(input.dataFilters) ? input.dataFilters : [],
        cacheTtlSeconds: input.cacheTtlSeconds ?? 60,
        timeoutMs: input.timeoutMs ?? 4000,
      })
      .returning();
    if (!created) {
      throw new ApplicationException('Failed to create External API preset.');
    }
    return maskExternalApiRecord(created);
  },

  update: async (
    id: string,
    input: ExternalApiUpsertInput,
    siteId?: string
  ): Promise<ExternalApiRecord> => {
    const resolvedSiteId = siteId ?? (await adminSiteId());
    const [existing] = await db
      .select()
      .from(externalApis)
      .where(
        and(eq(externalApis.id, id), eq(externalApis.siteId, resolvedSiteId))
      )
      .limit(1);
    if (!existing) {
      throw new ApplicationException('External API preset not found.');
    }
    const [updated] = await db
      .update(externalApis)
      .set({
        name: input.name.trim(),
        description: input.description?.trim() || null,
        endpointUrl: input.endpointUrl.trim(),
        method: input.method === 'POST' ? 'POST' : 'GET',
        headers: encryptHeadersForStorage(
          input.headers ?? {},
          existing.headers ?? {}
        ),
        secrets: encryptSecretMap(
          input.secrets ?? {},
          existing.secrets ?? {}
        ),
        body: input.body ?? null,
        itemsPath: input.itemsPath?.trim() ?? '',
        totalPath: input.totalPath?.trim() || null,
        selectedItemId: input.selectedItemId?.trim() || null,
        filterToSelectedItem: input.filterToSelectedItem ?? true,
        fieldId: input.fieldId?.trim() || 'id',
        fieldTitle: input.fieldTitle?.trim() || 'title',
        fieldUrl: input.fieldUrl?.trim() || null,
        fieldExcerpt: input.fieldExcerpt?.trim() || null,
        fieldImage: input.fieldImage?.trim() || null,
        fieldPublishedAt: input.fieldPublishedAt?.trim() || null,
        fields: Array.isArray(input.fields) ? input.fields : [],
        queryParams: input.queryParams ?? {},
        dataFilters: Array.isArray(input.dataFilters) ? input.dataFilters : [],
        cacheTtlSeconds: input.cacheTtlSeconds ?? 60,
        timeoutMs: input.timeoutMs ?? 4000,
      })
      .where(
        and(eq(externalApis.id, id), eq(externalApis.siteId, resolvedSiteId))
      )
      .returning();
    if (!updated) {
      throw new ApplicationException('External API preset not found.');
    }
    return maskExternalApiRecord(updated);
  },

  remove: async (id: string, siteId?: string): Promise<void> => {
    const resolvedSiteId = siteId ?? (await adminSiteId());
    const deleted = await db
      .delete(externalApis)
      .where(
        and(eq(externalApis.id, id), eq(externalApis.siteId, resolvedSiteId))
      )
      .returning({ id: externalApis.id });
    if (deleted.length === 0) {
      throw new ApplicationException('External API preset not found.');
    }
  },
};
