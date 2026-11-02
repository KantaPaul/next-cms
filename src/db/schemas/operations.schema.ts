import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  customType,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core';
import { baseColumns, relationConfig } from '@/db/helpers/base.columns';
import { collectionEntries } from '@/db/schemas/collections.schema';
import { pages, posts } from '@/db/schemas/pages.schema';
import { DEFAULT_SITE_ID } from '@/db/schemas/sites.schema';
import { videos } from '@/db/schemas/video.schema';

export { DEFAULT_SITE_ID };

const { id, ...timestampColumns } = baseColumns;
const { cascade } = relationConfig;

const tsvector = customType<{ data: string }>({
  dataType() {
    return 'tsvector';
  },
});

export const formSubmissions = pgTable(
  'form_submissions',
  {
    id,
    siteId: text('site_id').notNull().default(DEFAULT_SITE_ID),
    formGlobalId: text('form_global_id'),
    payload: jsonb('payload').$type<Record<string, string>>().notNull(),
    status: varchar('status', { length: 20 }).notNull().default('new'),
    spam: boolean('spam').notNull().default(false),
    ...timestampColumns,
  },
  t => [
    index('form_submissions_site_status_created_index').on(
      t.siteId,
      t.status,
      t.createdAt
    ),
    check(
      'form_submissions_status_check',
      sql`${t.status} in ('new', 'read', 'archived')`
    ),
  ]
);

export const redirects = pgTable(
  'redirects',
  {
    id,
    siteId: text('site_id').notNull().default(DEFAULT_SITE_ID),
    fromPath: varchar('from_path', { length: 500 }).notNull(),
    toPath: varchar('to_path', { length: 500 }).notNull(),
    statusCode: integer('status_code').notNull().default(301),
    ...timestampColumns,
  },
  t => [
    uniqueIndex('redirects_site_from_unique').on(t.siteId, t.fromPath),
    check('redirects_status_code_check', sql`${t.statusCode} in (301, 302)`),
  ]
);

export const searchDocuments = pgTable(
  'search_documents',
  {
    id,
    siteId: text('site_id').notNull().default(DEFAULT_SITE_ID),
    kind: varchar('kind', { length: 20 }).notNull(),
    pageId: text('page_id').references(() => pages.id, cascade),
    postId: text('post_id').references(() => posts.id, cascade),
    collectionEntryId: text('collection_entry_id').references(
      () => collectionEntries.id,
      cascade
    ),
    videoId: text('video_id').references(() => videos.id, cascade),
    title: varchar('title', { length: 255 }).notNull(),
    path: varchar('path', { length: 500 }).notNull(),
    language: text('language').notNull().default('en'),
    body: text('body').notNull().default(''),
    thumbnailUrl: text('thumbnail_url'),
    searchVector: tsvector('search_vector').generatedAlwaysAs(
      sql`setweight(to_tsvector('simple', coalesce(title, '')), 'A') || setweight(to_tsvector('simple', coalesce(body, '')), 'B')`
    ),
    ...timestampColumns,
  },
  t => [
    index('search_documents_site_language_index').on(t.siteId, t.language),
    uniqueIndex('search_documents_page_unique').on(t.pageId),
    uniqueIndex('search_documents_post_unique').on(t.postId),
    uniqueIndex('search_documents_collection_entry_unique').on(
      t.collectionEntryId
    ),
    uniqueIndex('search_documents_video_unique').on(t.videoId),
    check(
      'search_documents_kind_check',
      sql`${t.kind} in ('page', 'post', 'collection', 'video')`
    ),
    check(
      'search_documents_target_check',
      sql`num_nonnulls(${t.pageId}, ${t.postId}, ${t.collectionEntryId}, ${t.videoId}) = 1`
    ),
  ]
);

/**
 * Privacy-safe search query log (R592 / QRY-22): stores only normalized query
 * text, language, result count, and timestamp — never personal data, IP, or user ID.
 */
export const searchQueries = pgTable(
  'search_queries',
  {
    id,
    siteId: text('site_id').notNull().default(DEFAULT_SITE_ID),
    query: varchar('query', { length: 200 }).notNull(),
    language: varchar('language', { length: 12 }).notNull().default('en'),
    resultCount: integer('result_count').notNull().default(0),
    createdAt: baseColumns.createdAt,
  },
  t => [
    index('search_queries_site_created_index').on(t.siteId, t.createdAt),
    index('search_queries_site_results_index').on(t.siteId, t.resultCount),
  ]
);

export const loginTokens = pgTable(
  'login_tokens',
  {
    id,
    siteId: text('site_id').notNull().default(DEFAULT_SITE_ID),
    email: text('email').notNull(),
    tokenHash: text('token_hash').notNull().unique(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    usedAt: timestamp('used_at', { withTimezone: true }),
    createdAt: baseColumns.createdAt,
  },
  t => [index('login_tokens_email_index').on(t.email)]
);
