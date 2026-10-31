import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  text,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core';
import { baseColumns, relationConfig } from '@/db/helpers/base.columns';
import { roles, users } from '@/db/schemas/auth.schema';

const { id, ...timestampColumns } = baseColumns;
const { cascade } = relationConfig;

export const DEFAULT_SITE_ID = 'default';

export type SiteLocale = { code: string; label: string };

export const DEFAULT_SITE_LOCALES: SiteLocale[] = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Spanish' },
  { code: 'fr', label: 'French' },
  { code: 'de', label: 'German' },
  { code: 'ja', label: 'Japanese' },
];

export type SiteCopy = {
  siteName?: string;
  siteDescription?: string;
  seoTitle?: string;
  seoDescription?: string;
  headerTemplateId?: string | null;
  footerTemplateId?: string | null;
};

export const sites = pgTable(
  'sites',
  {
    id,
    name: varchar('name', { length: 120 }).notNull(),
    slug: varchar('slug', { length: 40 }),
    primaryHost: varchar('primary_host', { length: 255 }),
    extraDomains: text('extra_domains')
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    defaultLocale: varchar('default_locale', { length: 12 })
      .notNull()
      .default('en'),
    locales: jsonb('locales')
      .$type<SiteLocale[]>()
      .notNull()
      .default(DEFAULT_SITE_LOCALES),
    ...timestampColumns,
  },
  t => [
    uniqueIndex('sites_primary_host_unique')
      .on(t.primaryHost)
      .where(sql`${t.primaryHost} is not null`),
    uniqueIndex('sites_slug_unique').on(t.slug).where(sql`${t.slug} is not null`),
  ]
);

export const siteMemberships = pgTable(
  'site_memberships',
  {
    id,
    userId: text('user_id')
      .notNull()
      .references(() => users.id, cascade),
    siteId: text('site_id')
      .notNull()
      .references(() => sites.id, cascade),
    roleId: text('role_id')
      .notNull()
      .references(() => roles.id, cascade),
    ...timestampColumns,
  },
  t => [
    uniqueIndex('site_memberships_user_site_unique').on(t.userId, t.siteId),
    index('site_memberships_site_index').on(t.siteId),
  ]
);
