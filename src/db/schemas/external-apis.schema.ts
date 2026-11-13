import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  varchar,
} from 'drizzle-orm/pg-core';
import { baseColumns } from '@/db/helpers/base.columns';
import { DEFAULT_SITE_ID } from '@/db/schemas/sites.schema';
import type {
  ExternalApiDataFilter,
  ExternalApiFieldMapping,
} from '@/lib/external-api-schema';

const { id, ...timestampColumns } = baseColumns;

/** Saved, reusable External API connection & field mapping preset. */
export const externalApis = pgTable(
  'external_apis',
  {
    id,
    siteId: text('site_id').notNull().default(DEFAULT_SITE_ID),
    name: varchar('name', { length: 160 }).notNull(),
    description: text('description'),
    endpointUrl: varchar('endpoint_url', { length: 1000 }).notNull(),
    method: varchar('method', { length: 10 }).notNull().default('GET'),
    headers: jsonb('headers')
      .$type<Record<string, string>>()
      .notNull()
      .default({}),
    secrets: jsonb('secrets')
      .$type<Record<string, string>>()
      .notNull()
      .default({}),
    body: text('body'),
    itemsPath: varchar('items_path', { length: 255 }).notNull().default(''),
    totalPath: varchar('total_path', { length: 255 }),
    selectedItemId: varchar('selected_item_id', { length: 255 }),
    filterToSelectedItem: boolean('filter_to_selected_item')
      .notNull()
      .default(true),
    fieldId: varchar('field_id', { length: 255 }).notNull().default('id'),
    fieldTitle: varchar('field_title', { length: 255 }).notNull().default('title'),
    fieldUrl: varchar('field_url', { length: 255 }),
    fieldExcerpt: varchar('field_excerpt', { length: 255 }),
    fieldImage: varchar('field_image', { length: 255 }),
    fieldPublishedAt: varchar('field_published_at', { length: 255 }),
    fields: jsonb('fields')
      .$type<ExternalApiFieldMapping[]>()
      .notNull()
      .default([]),
    queryParams: jsonb('query_params')
      .$type<Record<string, string>>()
      .notNull()
      .default({}),
    dataFilters: jsonb('data_filters')
      .$type<ExternalApiDataFilter[]>()
      .notNull()
      .default([]),
    cacheTtlSeconds: integer('cache_ttl_seconds').notNull().default(60),
    timeoutMs: integer('timeout_ms').notNull().default(4000),
    ...timestampColumns,
  },
  t => [index('external_apis_site_id_index').on(t.siteId)]
);

export type ExternalApiRecord = typeof externalApis.$inferSelect;
export type NewExternalApiRecord = typeof externalApis.$inferInsert;
