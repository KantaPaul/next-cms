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
import { adminSiteId } from '@/server/services/site-context';

export interface ExternalApiUpsertInput {
  name: string;
  description?: string | null;
  endpointUrl: string;
  method: 'GET' | 'POST';
  headers?: Record<string, string>;
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

export const externalApisService = {
  list: async (siteId?: string): Promise<ExternalApiRecord[]> => {
    const resolvedSiteId = siteId ?? (await adminSiteId());
    return db
      .select()
      .from(externalApis)
      .where(eq(externalApis.siteId, resolvedSiteId))
      .orderBy(desc(externalApis.updatedAt), desc(externalApis.createdAt));
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
    return row ?? null;
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
        headers: input.headers ?? {},
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
    return created;
  },

  update: async (
    id: string,
    input: ExternalApiUpsertInput,
    siteId?: string
  ): Promise<ExternalApiRecord> => {
    const resolvedSiteId = siteId ?? (await adminSiteId());
    const [updated] = await db
      .update(externalApis)
      .set({
        name: input.name.trim(),
        description: input.description?.trim() || null,
        endpointUrl: input.endpointUrl.trim(),
        method: input.method === 'POST' ? 'POST' : 'GET',
        headers: input.headers ?? {},
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
    return updated;
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
