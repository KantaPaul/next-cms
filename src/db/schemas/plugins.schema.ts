import {
  boolean,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core';
import { baseColumns } from '@/db/helpers/base.columns';
import { DEFAULT_SITE_ID } from '@/db/schemas/sites.schema';

const { id, createdAt, updatedAt } = baseColumns;

/** Per-site plugin activation state, encrypted settings, and runtime diagnostics. */
export const plugins = pgTable(
  'plugins',
  {
    id,
    siteId: text('site_id').notNull().default(DEFAULT_SITE_ID),
    pluginId: varchar('plugin_id', { length: 120 }).notNull(),
    enabled: boolean('enabled').notNull().default(false),
    settings: jsonb('settings')
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    version: varchar('version', { length: 40 }),
    installedAt: timestamp('installed_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    lastError: text('last_error'),
    lastErrorAt: timestamp('last_error_at', { withTimezone: true }),
    lastCronRunAt: jsonb('last_cron_run_at').$type<Record<string, string>>(),
    createdAt,
    updatedAt,
  },
  t => [
    uniqueIndex('plugins_site_plugin_unique').on(t.siteId, t.pluginId),
    index('plugins_site_enabled_index').on(t.siteId, t.enabled),
  ]
);

/** Scoped key-value store available to plugins via `ctx.kv`. */
export const pluginKv = pgTable(
  'plugin_kv',
  {
    id,
    siteId: text('site_id').notNull().default(DEFAULT_SITE_ID),
    pluginId: varchar('plugin_id', { length: 120 }).notNull(),
    key: varchar('key', { length: 255 }).notNull(),
    value: jsonb('value').$type<unknown>(),
    createdAt,
    updatedAt,
  },
  t => [
    uniqueIndex('plugin_kv_site_plugin_key_unique').on(
      t.siteId,
      t.pluginId,
      t.key
    ),
    index('plugin_kv_site_plugin_index').on(t.siteId, t.pluginId),
  ]
);
