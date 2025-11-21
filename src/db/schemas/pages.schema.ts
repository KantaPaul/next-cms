import type {
  AnyPgColumn} from 'drizzle-orm/pg-core';
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';
import { baseColumns, relationConfig } from '@/db/helpers/base.columns';
import {
  PageStatus,
  pageStatusEnum,
  UserStatus,
  userStatusEnum,
} from '@/db/schemas/shared.schema';
import { json, type z } from 'zod';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { users } from '@/db/schemas/auth.schema';

const { id, ...timestampColumns } = baseColumns;
const { cascade, setNull } = relationConfig;

export const pages = pgTable('pages', {
  id,
  title: varchar('title', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull(),
  status: pageStatusEnum().default(PageStatus.draft),
  isHome: boolean('is_home').default(false),
  isBlogIndex: boolean('is_blog_index').default(false),
  language: text('language').default('en'),
  createdBy: text('created_by')
    .references(() => users.id, cascade)
    .notNull(),
  isBuilderEnable: boolean('is_builder_enable').default(false),
  ...timestampColumns,
});

export const pageContents = pgTable('page_contents', {
  id,
  pageId: text('page_id')
    .references(() => pages.id, cascade)
    .notNull(),
  content: jsonb('content').notNull(),
  excerpt: text('excerpt'),
  ...timestampColumns,
});

export const previewTokens = pgTable('preview_tokens', {
  id,
  pageId: text('page_id').references(() => pages.id, cascade),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expires_at'),
  ...timestampColumns,
});

export const seoMeta = pgTable('seo_meta', {
  id,
  pageId: text('page_id')
    .references(() => pages.id, cascade)
    .notNull(),
  title: varchar('title', { length: 255 }),
  description: text('description'),
  keywords: text('keywords'),
  canonicalUrl: varchar('canonical_url', { length: 500 }),
  ogTitle: varchar('og_title', { length: 255 }),
  ogDescription: text('og_description'),
  ogImage: varchar('og_image', { length: 500 }),
  twitterCard: varchar('twitter_card', { length: 50 }),
  ...timestampColumns,
});

// 🏷️ Categories
export const categories = pgTable('categories', {
  id,
  name: varchar('name', { length: 100 }).notNull(),
  slug: varchar('slug', { length: 150 }).notNull(),
  description: text('description'),
  parentId: text('parent_id').references((): AnyPgColumn => categories.id),
  language: text('language').default('en'),
  createdBy: text('created_by')
    .references(() => users.id, cascade)
    .notNull(),
  ...timestampColumns,
});

// 🏷️ Tags
export const tags = pgTable('tags', {
  id,
  name: varchar('name', { length: 100 }).notNull(),
  slug: varchar('slug', { length: 150 }).notNull(),
  language: text('language').default('en'),
  createdBy: text('created_by')
    .references(() => users.id, cascade)
    .notNull(),
  ...timestampColumns,
});

// 🔗 Pivot tables
export const pageCategories = pgTable("page_categories", {
  id,
  pageId: text("page_id").references(() => pages.id).notNull(),
  categoryId: text("category_id").references(() => categories.id).notNull(),
});

export const pageTags = pgTable("page_tags", {
  id,
  pageId: text("page_id").references(() => pages.id).notNull(),
  tagId: text("tag_id").references(() => tags.id).notNull(),
});