import { relations, sql } from 'drizzle-orm';
import type { AnyPgColumn } from 'drizzle-orm/pg-core';
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core';
import { baseColumns, relationConfig } from '@/db/helpers/base.columns';
import { users } from '@/db/schemas/auth.schema';
import { DEFAULT_SITE_ID } from '@/db/schemas/sites.schema';
import { type VideoSettings, DEFAULT_VIDEO_SETTINGS } from '@/db/schemas/video.schema';
import type { SiteCopy } from '@/db/schemas/sites.schema';
import {
  ContentKind,
  contentKindEnum,
  EditorType,
  editorTypeEnum,
  menuLocationEnum,
  PageStatus,
  PostLayout,
  pageStatusEnum,
  postLayoutEnum,
  previewTokenStatusEnum,
  revisionKindEnum,
  VisibilityStatus,
  visibilityStatusEnum,
} from '@/db/schemas/shared.schema';

const { id, ...timestampColumns } = baseColumns;
const { cascade, setNull } = relationConfig;

export const pages = pgTable(
  'pages',
  {
    id,
    siteId: text('site_id').notNull().default(DEFAULT_SITE_ID),
    title: varchar('title', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 255 }).notNull(),
    status: pageStatusEnum().default(PageStatus.draft).notNull(),
    visibility: visibilityStatusEnum()
      .default(VisibilityStatus.public)
      .notNull(),
    editorType: editorTypeEnum('editor_type')
      .default(EditorType.richtext)
      .notNull(),
    isHome: boolean('is_home').default(false).notNull(),
    /** The page that lists posts for its language; post pages link back to it. */
    isBlogIndex: boolean('is_blog_index').default(false).notNull(),
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
    uniqueIndex('pages_site_slug_language_unique')
      .on(t.siteId, t.slug, t.language)
      .where(sql`${t.deletedAt} is null`),
    index('pages_site_id_index').on(t.siteId),
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
    /** Bumped on every write; editors send the version they started from (R738). */
    version: integer('version').default(0).notNull(),
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
  t => [
    index('page_revisions_page_index').on(t.pageId, t.createdAt),
    index('page_revisions_page_kind_index').on(t.pageId, t.kind, t.createdAt),
  ]
);

/** A token previews exactly one page or one post. */
export const previewTokens = pgTable(
  'preview_tokens',
  {
    id,
    pageId: text('page_id').references(() => pages.id, cascade),
    postId: text('post_id').references((): AnyPgColumn => posts.id, cascade),
    token: text('token').notNull().unique(),
    status: previewTokenStatusEnum('status').default('active').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    viewCount: integer('view_count').default(0).notNull(),
    lastAccessedAt: timestamp('last_accessed_at', { withTimezone: true }),
    createdBy: text('created_by').references(() => users.id, setNull),
    ...timestampColumns,
  },
  t => [
    check(
      'preview_tokens_target_check',
      sql`num_nonnulls(${t.pageId}, ${t.postId}) = 1`
    ),
  ]
);

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

export const categories = pgTable(
  'categories',
  {
    id,
    siteId: text('site_id').notNull().default(DEFAULT_SITE_ID),
    name: varchar('name', { length: 100 }).notNull(),
  slug: varchar('slug', { length: 150 }).notNull(),
  description: text('description'),
  parentId: text('parent_id').references(
    (): AnyPgColumn => categories.id,
    setNull
  ),
  language: text('language').default('en'),
  createdBy: text('created_by')
    .references(() => users.id, cascade)
    .notNull(),
  ...timestampColumns,
  },
  t => [index('categories_site_id_index').on(t.siteId)]
);

export const tags = pgTable(
  'tags',
  {
    id,
    siteId: text('site_id').notNull().default(DEFAULT_SITE_ID),
    name: varchar('name', { length: 100 }).notNull(),
  slug: varchar('slug', { length: 150 }).notNull(),
  color: varchar('color', { length: 20 }).default('#6366f1').notNull(),
  language: text('language').default('en'),
  createdBy: text('created_by')
    .references(() => users.id, cascade)
    .notNull(),
  ...timestampColumns,
  },
  t => [index('tags_site_id_index').on(t.siteId)]
);

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
    siteId: text('site_id').notNull().default(DEFAULT_SITE_ID),
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
  t => [
    index('media_folder_index').on(t.folder),
    index('media_site_id_index').on(t.siteId),
  ]
);

export const menus = pgTable(
  'menus',
  {
    id,
    siteId: text('site_id').notNull().default(DEFAULT_SITE_ID),
    title: varchar('title', { length: 100 }).notNull(),
    location: menuLocationEnum('location').default('header').notNull(),
    language: text('language').notNull().default('en'),
    ...timestampColumns,
  },
  t => [
    uniqueIndex('menus_site_location_language_unique')
      .on(t.siteId, t.location, t.language)
      .where(sql`${t.deletedAt} is null`),
    index('menus_site_id_index').on(t.siteId),
  ]
);

export const menuItems = pgTable(
  'menu_items',
  {
    id,
    menuId: text('menu_id')
      .references(() => menus.id, cascade)
      .notNull(),
    parentId: text('parent_id').references(
      (): AnyPgColumn => menuItems.id,
      cascade
    ),
    label: varchar('label', { length: 100 }).notNull(),
    url: varchar('url', { length: 500 }).notNull(),
    target: varchar('target', { length: 10 }).default('_self').notNull(),
    badge: varchar('badge', { length: 30 }),
    order: integer('order').default(0).notNull(),
    ...timestampColumns,
  },
  t => [index('menu_items_menu_index').on(t.menuId, t.order)]
);

export type GlobalColorTokens = {
  primary?: string;
  secondary?: string;
  text?: string;
  textMuted?: string;
  accent?: string;
  background?: string;
  surface?: string;
  border?: string;
  custom?: Array<{ id: string; name: string; value: string }>;
};

export type TypographyPreset = {
  id: string;
  name: string;
  fontFamily?: string;
  fontSize?:
    | string
    | number
    | {
        desktop?: string | number;
        tablet?: string | number;
        mobile?: string | number;
      };
  fontWeight?: string | number;
  lineHeight?: string | number;
  letterSpacing?: string;
};

export const DEFAULT_GLOBAL_COLORS: GlobalColorTokens = {
  primary: '#4f46e5',
  secondary: '#64748b',
  text: '#0f172a',
  textMuted: '#64748b',
  accent: '#0ea5e9',
  background: '#ffffff',
  surface: '#f8fafc',
  border: '#e2e8f0',
  custom: [],
};

export const DEFAULT_TYPOGRAPHY_PRESETS: TypographyPreset[] = [
  {
    id: 'h1',
    name: 'Heading 1',
    fontFamily: 'Inter',
    fontSize: { desktop: '2.5rem', tablet: '2rem', mobile: '1.75rem' },
    fontWeight: '700',
    lineHeight: '1.2',
    letterSpacing: '-0.02em',
  },
  {
    id: 'h2',
    name: 'Heading 2',
    fontFamily: 'Inter',
    fontSize: { desktop: '2rem', tablet: '1.75rem', mobile: '1.5rem' },
    fontWeight: '600',
    lineHeight: '1.25',
    letterSpacing: '-0.01em',
  },
  {
    id: 'h3',
    name: 'Heading 3',
    fontFamily: 'Inter',
    fontSize: { desktop: '1.5rem', tablet: '1.35rem', mobile: '1.25rem' },
    fontWeight: '600',
    lineHeight: '1.3',
  },
  {
    id: 'body',
    name: 'Body',
    fontFamily: 'Inter',
    fontSize: '1rem',
    fontWeight: '400',
    lineHeight: '1.5',
  },
  {
    id: 'caption',
    name: 'Caption',
    fontFamily: 'Inter',
    fontSize: '0.875rem',
    fontWeight: '400',
    lineHeight: '1.4',
  },
  {
    id: 'button',
    name: 'Button',
    fontFamily: 'Inter',
    fontSize: '0.875rem',
    fontWeight: '500',
    lineHeight: '1',
  },
];

export type ThemeTokens = {
  primaryColor: string;
  accentColor: string;
  fontFamily: 'Inter' | 'Plus Jakarta Sans' | 'JetBrains Mono' | 'System';
  borderRadius: 'none' | 'sm' | 'md' | 'lg' | 'full';
  colorMode: 'light' | 'dark' | 'system';
  colors?: GlobalColorTokens;
  typography?: TypographyPreset[];
};

export const DEFAULT_THEME_TOKENS: ThemeTokens = {
  primaryColor: '#4f46e5',
  accentColor: '#0ea5e9',
  fontFamily: 'Inter',
  borderRadius: 'md',
  colorMode: 'light',
  colors: DEFAULT_GLOBAL_COLORS,
  typography: DEFAULT_TYPOGRAPHY_PRESETS,
};

export const SITE_SETTINGS_ID = 'default';

export const siteSettings = pgTable('site_settings', {
  id: text('id').primaryKey().default(SITE_SETTINGS_ID),
  siteId: text('site_id').notNull().default(DEFAULT_SITE_ID).unique(),
  siteName: varchar('site_name', { length: 100 }).default('Next CMS').notNull(),
  siteDescription: text('site_description'),
  seoTitle: varchar('seo_title', { length: 160 }),
  seoDescription: text('seo_description'),
  translations: jsonb('translations').$type<Record<string, SiteCopy>>(),
  siteUrl: varchar('site_url', { length: 255 }),
  logo: text('logo'),
  favicon: text('favicon'),
  defaultOgImage: text('default_og_image'),
  headerMenuId: text('header_menu_id').references(() => menus.id, setNull),
  footerMenuId: text('footer_menu_id').references(() => menus.id, setNull),
  themeTokens: jsonb('theme_tokens')
    .$type<ThemeTokens>()
    .default(DEFAULT_THEME_TOKENS)
    .notNull(),
  videoSettings: jsonb('video_settings')
    .$type<VideoSettings>()
    .default(DEFAULT_VIDEO_SETTINGS)
    .notNull(),
  robotsTxt: text('robots_txt'),
  googleAnalyticsId: varchar('google_analytics_id', { length: 50 }),
  updatedAt: baseColumns.updatedAt,
});

export const globalBlocks = pgTable(
  'global_blocks',
  {
    id,
    siteId: text('site_id').notNull().default(DEFAULT_SITE_ID),
    name: varchar('name', { length: 150 }).notNull(),
  category: varchar('category', { length: 50 }).default('General').notNull(),
  content: jsonb('content').notNull(),
  createdBy: text('created_by').references(() => users.id, setNull),
  ...timestampColumns,
  },
  t => [index('global_blocks_site_id_index').on(t.siteId)]
);

export const pageTemplates = pgTable(
  'page_templates',
  {
    id,
    siteId: text('site_id').notNull().default(DEFAULT_SITE_ID),
    name: varchar('name', { length: 150 }).notNull(),
  description: text('description'),
  category: varchar('category', { length: 50 }).default('Landing').notNull(),
  editorType: editorTypeEnum('editor_type')
    .default(EditorType.builder)
    .notNull(),
  content: jsonb('content').notNull(),
  thumbnailUrl: text('thumbnail_url'),
  isSystem: boolean('is_system').default(false).notNull(),
  createdBy: text('created_by').references(() => users.id, setNull),
  ...timestampColumns,
  },
  t => [index('page_templates_site_id_index').on(t.siteId)]
);

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

export const apiKeys = pgTable(
  'api_keys',
  {
    id,
    siteId: text('site_id').notNull().default(DEFAULT_SITE_ID),
    name: varchar('name', { length: 100 }).notNull(),
    prefix: varchar('prefix', { length: 20 }).notNull(),
    hashedKey: text('hashed_key').notNull().unique(),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    createdBy: text('created_by').references(() => users.id, setNull),
    /** Fixed after creation. Existing keys keep `{content:read}`. */
    scopes: text('scopes')
      .array()
      .notNull()
      .default(sql`'{"content:read"}'::text[]`),
    createdAt: baseColumns.createdAt,
    },
  t => [index('api_keys_site_id_index').on(t.siteId)]
);

/** First-party page view events recorded by the public beacon. */
// export const pageViews = pgTable(
//   'page_views',
//   {
//     id,
//     pageId: text('page_id')
//       .references(() => pages.id, cascade)
//       .notNull(),
//     path: varchar('path', { length: 500 }).notNull(),
//     referrerHost: varchar('referrer_host', { length: 255 }),
//     visitorId: text('visitor_id').notNull(),
//     createdAt: baseColumns.createdAt,
//   },
//   t => [
//     index('page_views_created_at_index').on(t.createdAt),
//     index('page_views_page_created_at_index').on(t.pageId, t.createdAt),
//   ]
// );

export const pageViews = pgTable(
  'page_views',
  {
    id,
    siteId: text('site_id').notNull().default(DEFAULT_SITE_ID),
    pageId: text('page_id').references(() => pages.id, cascade),
    postId: text('post_id').references(() => posts.id, cascade),
    path: varchar('path', { length: 500 }).notNull(),
    referrerHost: varchar('referrer_host', { length: 255 }),
    visitorId: text('visitor_id').notNull(),
    /** A/B experiment variant (`a` or `b`) for the assigned page experiment. Null without one. */
    variant: varchar('variant', { length: 1 }),
    ...timestampColumns,
  },
  t => [
    index('page_views_created_at_index').on(t.createdAt),
    index('page_views_page_created_at_index').on(t.pageId, t.createdAt),
    index('page_views_post_created_at_index').on(t.postId, t.createdAt),
    index('page_views_site_id_index').on(t.siteId),
    check(
      'page_views_target_check',
      sql`num_nonnulls(${t.pageId}, ${t.postId}) = 1`
    ),
  ]
);

/** Shared fixed-window rate counter for API keys, lives in Postgres. */
export const apiRateWindows = pgTable(
  'api_rate_windows',
  {
    apiKeyId: text('api_key_id')
      .references(() => apiKeys.id, { onDelete: 'cascade' })
      .notNull(),
    windowStart: timestamp('window_start', { withTimezone: true })
      .notNull()
      .defaultNow(),
    count: integer('count').notNull().default(0),
    ...timestampColumns,
  },
  t => [
    index('api_rate_windows_api_key_id_index').on(t.apiKeyId),
    index('api_rate_windows_window_start_index').on(t.windowStart),
  ]
);

/** Soft edit lock for the page and post builders. One editor at a time per target. */
export const editorLocks = pgTable(
  'editor_locks',
  {
    id,
    siteId: text('site_id').notNull().default(DEFAULT_SITE_ID),
    targetType: varchar('target_type', { length: 20 }).notNull(),
    targetId: text('target_id').notNull(),
    userId: text('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    ...timestampColumns,
  },
  t => [
    unique('editor_locks_target_unique').on(t.targetType, t.targetId),
    index('editor_locks_site_id_index').on(t.siteId),
    index('editor_locks_last_seen_at_index').on(t.lastSeenAt),
    check(
      'editor_locks_target_check',
      sql`${t.targetType} in ('page', 'post')`
    ),
  ]
);

/**
 * Named single-post layouts. `content` is the live Puck data (null until first publish); `draftContent`
 * autosaves. The one `isDefault` row applies to every `layout = template` post without a `templateId`.
 */
export const postTemplates = pgTable(
  'post_templates',
  {
    id,
    siteId: text('site_id').notNull().default(DEFAULT_SITE_ID),
    name: varchar('name', { length: 150 }).notNull(),
    description: text('description'),
    content: jsonb('content'),
    draftContent: jsonb('draft_content'),
    isDefault: boolean('is_default').default(false).notNull(),
    createdBy: text('created_by').references(() => users.id, setNull),
    ...timestampColumns,
  },
  t => [
    uniqueIndex('post_templates_default_unique')
      .on(t.siteId)
      .where(sql`${t.isDefault} = true`),
    index('post_templates_site_id_index').on(t.siteId),
  ]
);

export const posts = pgTable(
  'posts',
  {
    id,
    siteId: text('site_id').notNull().default(DEFAULT_SITE_ID),
    title: varchar('title', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 255 }).notNull(),
    excerpt: text('excerpt'),
    featuredImage: text('featured_image'),
    status: pageStatusEnum().default(PageStatus.draft).notNull(),
    visibility: visibilityStatusEnum()
      .default(VisibilityStatus.public)
      .notNull(),
    layout: postLayoutEnum('layout').default(PostLayout.template).notNull(),
    /** Null uses the default template. */
    templateId: text('template_id').references(() => postTemplates.id, setNull),
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
    uniqueIndex('posts_site_slug_language_unique')
      .on(t.siteId, t.slug, t.language)
      .where(sql`${t.deletedAt} is null`),
    index('posts_site_id_index').on(t.siteId),
    index('posts_status_published_index').on(t.status, t.publishedAt),
    index('posts_deleted_at_index').on(t.deletedAt),
  ]
);

/** `body` is the rich-text article. `canvas` is Puck data, only used while the post's layout is `custom`. */
export const postContents = pgTable(
  'post_contents',
  {
    id,
    postId: text('post_id')
      .references(() => posts.id, cascade)
      .notNull(),
    kind: contentKindEnum('kind').default(ContentKind.draft).notNull(),
    body: text('body').default('').notNull(),
    canvas: jsonb('canvas'),
    ...timestampColumns,
  },
  t => [uniqueIndex('post_contents_post_kind_unique').on(t.postId, t.kind)]
);

export const postRevisions = pgTable(
  'post_revisions',
  {
    id,
    postId: text('post_id')
      .references(() => posts.id, cascade)
      .notNull(),
    kind: revisionKindEnum('kind').notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    label: varchar('label', { length: 255 }),
    layout: postLayoutEnum('layout').notNull(),
    body: text('body'),
    canvas: jsonb('canvas'),
    authorId: text('author_id').references(() => users.id, setNull),
    createdAt: baseColumns.createdAt,
  },
  t => [
    index('post_revisions_post_index').on(t.postId, t.createdAt),
    index('post_revisions_post_kind_index').on(t.postId, t.kind, t.createdAt),
  ]
);

export const postSeo = pgTable('post_seo', {
  id,
  postId: text('post_id')
    .references(() => posts.id, cascade)
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

export const postCategories = pgTable(
  'post_categories',
  {
    postId: text('post_id')
      .references(() => posts.id, cascade)
      .notNull(),
    categoryId: text('category_id')
      .references(() => categories.id, cascade)
      .notNull(),
  },
  t => [
    primaryKey({ columns: [t.postId, t.categoryId] }),
    index('post_categories_category_index').on(t.categoryId),
  ]
);

export const postTags = pgTable(
  'post_tags',
  {
    postId: text('post_id')
      .references(() => posts.id, cascade)
      .notNull(),
    tagId: text('tag_id')
      .references(() => tags.id, cascade)
      .notNull(),
  },
  t => [
    primaryKey({ columns: [t.postId, t.tagId] }),
    index('post_tags_tag_index').on(t.tagId),
  ]
);

export const postsRelations = relations(posts, ({ one, many }) => ({
  author: one(users, { fields: [posts.createdBy], references: [users.id] }),
  template: one(postTemplates, {
    fields: [posts.templateId],
    references: [postTemplates.id],
  }),
  contents: many(postContents),
  seo: one(postSeo, { fields: [posts.id], references: [postSeo.postId] }),
  categories: many(postCategories),
  tags: many(postTags),
  revisions: many(postRevisions),
  views: many(pageViews),
}));

export const postContentsRelations = relations(postContents, ({ one }) => ({
  post: one(posts, { fields: [postContents.postId], references: [posts.id] }),
}));

export const postRevisionsRelations = relations(postRevisions, ({ one }) => ({
  post: one(posts, { fields: [postRevisions.postId], references: [posts.id] }),
  author: one(users, {
    fields: [postRevisions.authorId],
    references: [users.id],
  }),
}));

export const postCategoriesRelations = relations(postCategories, ({ one }) => ({
  post: one(posts, { fields: [postCategories.postId], references: [posts.id] }),
  category: one(categories, {
    fields: [postCategories.categoryId],
    references: [categories.id],
  }),
}));

export const postTagsRelations = relations(postTags, ({ one }) => ({
  post: one(posts, { fields: [postTags.postId], references: [posts.id] }),
  tag: one(tags, { fields: [postTags.tagId], references: [tags.id] }),
}));

export const pagesRelations = relations(pages, ({ one, many }) => ({
  author: one(users, { fields: [pages.createdBy], references: [users.id] }),
  contents: many(pageContents),
  seo: one(seoMeta, { fields: [pages.id], references: [seoMeta.pageId] }),
  categories: many(pageCategories),
  tags: many(pageTags),
  revisions: many(pageRevisions),
  previewTokens: many(previewTokens),
  views: many(pageViews),
}));

export const pageViewsRelations = relations(pageViews, ({ one }) => ({
  page: one(pages, { fields: [pageViews.pageId], references: [pages.id] }),
  post: one(posts, { fields: [pageViews.postId], references: [posts.id] }),
}));

export const pageContentsRelations = relations(pageContents, ({ one }) => ({
  page: one(pages, { fields: [pageContents.pageId], references: [pages.id] }),
}));

export const pageRevisionsRelations = relations(pageRevisions, ({ one }) => ({
  page: one(pages, { fields: [pageRevisions.pageId], references: [pages.id] }),
  author: one(users, {
    fields: [pageRevisions.authorId],
    references: [users.id],
  }),
}));

export const previewTokensRelations = relations(previewTokens, ({ one }) => ({
  page: one(pages, { fields: [previewTokens.pageId], references: [pages.id] }),
  post: one(posts, { fields: [previewTokens.postId], references: [posts.id] }),
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
  posts: many(postCategories),
}));

export const tagsRelations = relations(tags, ({ many }) => ({
  pages: many(pageTags),
  posts: many(postTags),
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
