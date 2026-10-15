import type { AnyPgColumn } from 'drizzle-orm/pg-core';
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { baseColumns, relationConfig } from '@/db/helpers/base.columns';
import {
  ContentKind,
  contentKindEnum,
  EditorType,
  editorTypeEnum,
  menuLocationEnum,
  PageStatus,
  pageStatusEnum,
  previewTokenStatusEnum,
  revisionKindEnum,
  VisibilityStatus,
  visibilityStatusEnum,
} from '@/db/schemas/shared.schema';
import { users } from '@/db/schemas/auth.schema';

const { id, ...timestampColumns } = baseColumns;
const { cascade, setNull } = relationConfig;

export const pages = pgTable(
  'pages',
  {
    id,
    title: varchar('title', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 255 }).notNull(),
    status: pageStatusEnum().default(PageStatus.draft).notNull(),
    visibility: visibilityStatusEnum().default(VisibilityStatus.public).notNull(),
    editorType: editorTypeEnum('editor_type').default(EditorType.richtext).notNull(),
    isHome: boolean('is_home').default(false).notNull(),
    isBlogIndex: boolean('is_blog_index').default(false),
    language: text('language').default('en').notNull(),
    translationGroupId: text('translation_group_id'),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    scheduledAt: timestamp('scheduled_at', { withTimezone: true }),
    createdBy: text('created_by')
      .references(() => users.id, cascade)
      .notNull(),
    ...timestampColumns,
  },
  t => [
    uniqueIndex('pages_slug_language_unique')
      .on(t.slug, t.language)
      .where(sql`${t.deletedAt} is null`),
    index('pages_status_index').on(t.status),
    index('pages_translation_group_index').on(t.translationGroupId),
    index('pages_deleted_at_index').on(t.deletedAt),
  ]
);

export const pageContents = pgTable(
  'page_contents',
  {
    id,
    pageId: text('page_id')
      .references(() => pages.id, cascade)
      .notNull(),
    kind: contentKindEnum('kind').default(ContentKind.draft).notNull(),
    content: jsonb('content'),
    ...timestampColumns,
  },
  t => [uniqueIndex('page_contents_page_kind_unique').on(t.pageId, t.kind)]
);

export const pageRevisions = pgTable(
  'page_revisions',
  {
    id,
    pageId: text('page_id')
      .references(() => pages.id, cascade)
      .notNull(),
    editorType: editorTypeEnum('editor_type').notNull(),
    kind: revisionKindEnum('kind').notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    label: varchar('label', { length: 255 }),
    content: jsonb('content'),
    authorId: text('author_id').references(() => users.id, setNull),
    createdAt: baseColumns.createdAt,
  },
  t => [index('page_revisions_page_index').on(t.pageId, t.createdAt)]
);

export const previewTokens = pgTable('preview_tokens', {
  id,
  pageId: text('page_id')
    .references(() => pages.id, cascade)
    .notNull(),
  token: text('token').notNull().unique(),
  status: previewTokenStatusEnum('status').default('active').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  viewCount: integer('view_count').default(0).notNull(),
  lastAccessedAt: timestamp('last_accessed_at', { withTimezone: true }),
  createdBy: text('created_by').references(() => users.id, setNull),
  ...timestampColumns,
});

export const seoMeta = pgTable('seo_meta', {
  id,
  pageId: text('page_id')
    .references(() => pages.id, cascade)
    .notNull()
    .unique(),
  title: varchar('title', { length: 255 }),
  description: text('description'),
  keywords: text('keywords'),
  canonicalUrl: varchar('canonical_url', { length: 500 }),
  ogTitle: varchar('og_title', { length: 255 }),
  ogDescription: text('og_description'),
  ogImage: varchar('og_image', { length: 500 }),
  ogType: varchar('og_type', { length: 50 }),
  twitterCard: varchar('twitter_card', { length: 50 }),
  noIndex: boolean('no_index').default(false).notNull(),
  structuredDataType: varchar('structured_data_type', { length: 50 }),
  ...timestampColumns,
});

export const categories = pgTable('categories', {
  id,
  name: varchar('name', { length: 100 }).notNull(),
  slug: varchar('slug', { length: 150 }).notNull(),
  description: text('description'),
  parentId: text('parent_id').references((): AnyPgColumn => categories.id, setNull),
  language: text('language').default('en'),
  createdBy: text('created_by')
    .references(() => users.id, cascade)
    .notNull(),
  ...timestampColumns,
});

export const tags = pgTable('tags', {
  id,
  name: varchar('name', { length: 100 }).notNull(),
  slug: varchar('slug', { length: 150 }).notNull(),
  color: varchar('color', { length: 20 }).default('#6366f1').notNull(),
  language: text('language').default('en'),
  createdBy: text('created_by')
    .references(() => users.id, cascade)
    .notNull(),
  ...timestampColumns,
});

export const pageCategories = pgTable(
  'page_categories',
  {
    pageId: text('page_id')
      .references(() => pages.id, cascade)
      .notNull(),
    categoryId: text('category_id')
      .references(() => categories.id, cascade)
      .notNull(),
  },
  t => [primaryKey({ columns: [t.pageId, t.categoryId] })]
);

export const pageTags = pgTable(
  'page_tags',
  {
    pageId: text('page_id')
      .references(() => pages.id, cascade)
      .notNull(),
    tagId: text('tag_id')
      .references(() => tags.id, cascade)
      .notNull(),
  },
  t => [primaryKey({ columns: [t.pageId, t.tagId] })]
);

export const media = pgTable(
  'media',
  {
    id,
    key: text('key').notNull().unique(),
    url: text('url').notNull(),
    filename: varchar('filename', { length: 255 }).notNull(),
    title: varchar('title', { length: 255 }),
    alt: text('alt'),
    mime: varchar('mime', { length: 100 }).notNull(),
    size: integer('size').notNull(),
    width: integer('width'),
    height: integer('height'),
    folder: varchar('folder', { length: 100 }).default('uploads').notNull(),
    createdBy: text('created_by').references(() => users.id, setNull),
    ...timestampColumns,
  },
  t => [index('media_folder_index').on(t.folder)]
);

export const menus = pgTable('menus', {
  id,
  title: varchar('title', { length: 100 }).notNull(),
  location: menuLocationEnum('location').default('header').notNull(),
  ...timestampColumns,
});

export const menuItems = pgTable(
  'menu_items',
  {
    id,
    menuId: text('menu_id')
      .references(() => menus.id, cascade)
      .notNull(),
    parentId: text('parent_id').references((): AnyPgColumn => menuItems.id, cascade),
    label: varchar('label', { length: 100 }).notNull(),
    url: varchar('url', { length: 500 }).notNull(),
    target: varchar('target', { length: 10 }).default('_self').notNull(),
    badge: varchar('badge', { length: 30 }),
    order: integer('order').default(0).notNull(),
    ...timestampColumns,
  },
  t => [index('menu_items_menu_index').on(t.menuId, t.order)]
);

export type ThemeTokens = {
  primaryColor: string;
  accentColor: string;
  fontFamily: 'Inter' | 'Plus Jakarta Sans' | 'JetBrains Mono' | 'System';
  borderRadius: 'none' | 'sm' | 'md' | 'lg' | 'full';
  colorMode: 'light' | 'dark' | 'system';
};

export const DEFAULT_THEME_TOKENS: ThemeTokens = {
  primaryColor: '#4f46e5',
  accentColor: '#0ea5e9',
  fontFamily: 'Inter',
  borderRadius: 'md',
  colorMode: 'light',
};

export const SITE_SETTINGS_ID = 'default';

export const siteSettings = pgTable('site_settings', {
  id: text('id').primaryKey().default(SITE_SETTINGS_ID),
  siteName: varchar('site_name', { length: 100 }).default('Next CMS').notNull(),
  siteDescription: text('site_description'),
  siteUrl: varchar('site_url', { length: 255 }),
  logo: text('logo'),
  favicon: text('favicon'),
  defaultOgImage: text('default_og_image'),
  headerMenuId: text('header_menu_id').references(() => menus.id, setNull),
  footerMenuId: text('footer_menu_id').references(() => menus.id, setNull),
  themeTokens: jsonb('theme_tokens').$type<ThemeTokens>().default(DEFAULT_THEME_TOKENS).notNull(),
  robotsTxt: text('robots_txt'),
  googleAnalyticsId: varchar('google_analytics_id', { length: 50 }),
  updatedAt: baseColumns.updatedAt,
});

export const globalBlocks = pgTable('global_blocks', {
  id,
  name: varchar('name', { length: 150 }).notNull(),
  category: varchar('category', { length: 50 }).default('General').notNull(),
  content: jsonb('content').notNull(),
  createdBy: text('created_by').references(() => users.id, setNull),
  ...timestampColumns,
});

export const pageTemplates = pgTable('page_templates', {
  id,
  name: varchar('name', { length: 150 }).notNull(),
  description: text('description'),
  category: varchar('category', { length: 50 }).default('Landing').notNull(),
  editorType: editorTypeEnum('editor_type').default(EditorType.builder).notNull(),
  content: jsonb('content').notNull(),
  thumbnailUrl: text('thumbnail_url'),
  isSystem: boolean('is_system').default(false).notNull(),
  createdBy: text('created_by').references(() => users.id, setNull),
  ...timestampColumns,
});

export const auditLogs = pgTable(
  'audit_logs',
  {
    id,
    actorId: text('actor_id').references(() => users.id, setNull),
    action: varchar('action', { length: 50 }).notNull(),
    targetType: varchar('target_type', { length: 50 }).notNull(),
    targetId: text('target_id'),
    targetName: varchar('target_name', { length: 255 }),
    details: text('details'),
    createdAt: baseColumns.createdAt,
  },
  t => [index('audit_logs_created_at_index').on(t.createdAt)]
);

export const apiKeys = pgTable('api_keys', {
  id,
  name: varchar('name', { length: 100 }).notNull(),
  prefix: varchar('prefix', { length: 20 }).notNull(),
  hashedKey: text('hashed_key').notNull().unique(),
  lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
  createdBy: text('created_by').references(() => users.id, setNull),
  createdAt: baseColumns.createdAt,
});

export const pagesRelations = relations(pages, ({ one, many }) => ({
  author: one(users, { fields: [pages.createdBy], references: [users.id] }),
  contents: many(pageContents),
  seo: one(seoMeta, { fields: [pages.id], references: [seoMeta.pageId] }),
  categories: many(pageCategories),
  tags: many(pageTags),
  revisions: many(pageRevisions),
  previewTokens: many(previewTokens),
}));

export const pageContentsRelations = relations(pageContents, ({ one }) => ({
  page: one(pages, { fields: [pageContents.pageId], references: [pages.id] }),
}));

export const pageRevisionsRelations = relations(pageRevisions, ({ one }) => ({
  page: one(pages, { fields: [pageRevisions.pageId], references: [pages.id] }),
  author: one(users, { fields: [pageRevisions.authorId], references: [users.id] }),
}));

export const previewTokensRelations = relations(previewTokens, ({ one }) => ({
  page: one(pages, { fields: [previewTokens.pageId], references: [pages.id] }),
}));

export const pageCategoriesRelations = relations(pageCategories, ({ one }) => ({
  page: one(pages, { fields: [pageCategories.pageId], references: [pages.id] }),
  category: one(categories, {
    fields: [pageCategories.categoryId],
    references: [categories.id],
  }),
}));

export const pageTagsRelations = relations(pageTags, ({ one }) => ({
  page: one(pages, { fields: [pageTags.pageId], references: [pages.id] }),
  tag: one(tags, { fields: [pageTags.tagId], references: [tags.id] }),
}));

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  parent: one(categories, {
    fields: [categories.parentId],
    references: [categories.id],
    relationName: 'category_parent',
  }),
  children: many(categories, { relationName: 'category_parent' }),
  pages: many(pageCategories),
}));

export const tagsRelations = relations(tags, ({ many }) => ({
  pages: many(pageTags),
}));

export const menusRelations = relations(menus, ({ many }) => ({
  items: many(menuItems),
}));

export const menuItemsRelations = relations(menuItems, ({ one }) => ({
  menu: one(menus, { fields: [menuItems.menuId], references: [menus.id] }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  actor: one(users, { fields: [auditLogs.actorId], references: [users.id] }),
}));
