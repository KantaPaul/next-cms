import { relations, sql } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core';
import { baseColumns, relationConfig } from '@/db/helpers/base.columns';
import { DEFAULT_SITE_ID } from '@/db/schemas/sites.schema';
import { pages } from '@/db/schemas/pages.schema';
import { users } from '@/db/schemas/auth.schema';
import {
  postLayoutEnum,
  PostLayout,
  visibilityStatusEnum,
  VisibilityStatus,
} from '@/db/schemas/shared.schema';
import {
  type PostTypeSupports,
  DEFAULT_POST_TYPE_SUPPORTS,
} from '@/config/post-types';
import {
  type CollectionBlockSettings,
  DEFAULT_COLLECTION_BLOCK_SETTINGS,
} from '@/config/block-manager';
import type { SeoInput } from '@/db/validations/pages.validation';

const { id, ...timestampColumns } = baseColumns;
const { cascade } = relationConfig;

export const collectionStatusEnum = pgEnum('collection_status', [
  'active',
  'archived',
]);
export type CollectionStatus = (typeof collectionStatusEnum.enumValues)[number];

export const collectionEntryStatusEnum = pgEnum('collection_entry_status', [
  'draft',
  'review',
  'scheduled',
  'published',
]);
export type CollectionEntryStatus = (typeof collectionEntryStatusEnum.enumValues)[number];

export const collectionFieldTypeEnum = pgEnum('collection_field_type', [
  'text',
  'richtext',
  'number',
  'boolean',
  'date',
  'select',
  'media',
  'relation',
  'url',
]);
export type CollectionFieldType = (typeof collectionFieldTypeEnum.enumValues)[number];

/** A site-scoped collection of structured JSON entries. */
export const collections = pgTable(
  'collections',
  {
    id,
    siteId: text('site_id').notNull().default(DEFAULT_SITE_ID),
    /** Plural label shown in the dashboard ("Team members"). */
    name: varchar('name', { length: 150 }).notNull(),
    /** Singular label used for buttons and headings ("Team member"). */
    singularName: varchar('singular_name', { length: 150 }),
    slug: varchar('slug', { length: 150 }).notNull(),
    /** Lucide icon key shown next to the type in the dashboard. */
    icon: varchar('icon', { length: 50 }),
    description: text('description'),
    /** Optional page that renders entries of this collection. */
    templatePageId: text('template_page_id').references(() => pages.id, {
      onDelete: 'set null',
      onUpdate: 'cascade',
    }),
    status: collectionStatusEnum('status').default('active').notNull(),
    supports: jsonb('supports')
      .$type<PostTypeSupports>()
      .default(DEFAULT_POST_TYPE_SUPPORTS)
      .notNull(),
    /** Per-post-type block manager: hidden blocks per editor kind (overrides site-wide settings). */
    blockSettings: jsonb('block_settings')
      .$type<CollectionBlockSettings>()
      .default(DEFAULT_COLLECTION_BLOCK_SETTINGS)
      .notNull(),
    ...timestampColumns,
  },
  t => [
    uniqueIndex('collections_site_slug_unique')
      .on(t.siteId, t.slug)
      .where(sql`${t.deletedAt} is null`),
    index('collections_site_id_index').on(t.siteId),
    index('collections_template_page_id_index').on(t.templatePageId),
  ]
);

/** A field definition on a collection. */
export const collectionFields = pgTable(
  'collection_fields',
  {
    id,
    collectionId: text('collection_id')
      .references(() => collections.id, { onDelete: 'cascade' })
      .notNull(),
    key: varchar('key', { length: 100 }).notNull(),
    label: varchar('label', { length: 150 }).notNull(),
    type: collectionFieldTypeEnum('type').notNull(),
    required: boolean('required').default(false).notNull(),
    position: integer('position').notNull().default(0),
    /** Select choices (string[]) or the related collection id for relations. */
    config: jsonb('config').notNull().default({}),
    ...timestampColumns,
  },
  t => [
    uniqueIndex('collection_fields_collection_key_unique').on(
      t.collectionId,
      t.key
    ),
    index('collection_fields_collection_id_index').on(t.collectionId),
  ]
);

/** Taxonomies defined per post type (e.g. Department on Team). */
export const collectionTaxonomies = pgTable(
  'collection_taxonomies',
  {
    id,
    siteId: text('site_id').notNull().default(DEFAULT_SITE_ID),
    collectionId: text('collection_id')
      .references(() => collections.id, { onDelete: 'cascade' })
      .notNull(),
    key: varchar('key', { length: 100 }).notNull(),
    name: varchar('name', { length: 150 }).notNull(),
    singularName: varchar('singular_name', { length: 150 }),
    hierarchical: boolean('hierarchical').default(false).notNull(),
    position: integer('position').notNull().default(0),
    ...timestampColumns,
  },
  t => [
    uniqueIndex('collection_taxonomies_collection_key_unique').on(
      t.collectionId,
      t.key
    ),
    index('collection_taxonomies_collection_id_index').on(t.collectionId),
    index('collection_taxonomies_site_id_index').on(t.siteId),
  ]
);

/** Terms inside a post type taxonomy (e.g. Engineering under Department). */
export const collectionTerms = pgTable(
  'collection_terms',
  {
    id,
    siteId: text('site_id').notNull().default(DEFAULT_SITE_ID),
    taxonomyId: text('taxonomy_id')
      .references(() => collectionTaxonomies.id, { onDelete: 'cascade' })
      .notNull(),
    name: varchar('name', { length: 150 }).notNull(),
    slug: varchar('slug', { length: 150 }).notNull(),
    description: text('description'),
    parentId: text('parent_id').references((): any => collectionTerms.id, {
      onDelete: 'set null',
    }),
    position: integer('position').notNull().default(0),
    ...timestampColumns,
  },
  t => [
    uniqueIndex('collection_terms_taxonomy_slug_unique')
      .on(t.taxonomyId, t.slug)
      .where(sql`${t.deletedAt} is null`),
    index('collection_terms_taxonomy_id_index').on(t.taxonomyId),
    index('collection_terms_parent_id_index').on(t.parentId),
    index('collection_terms_site_id_index').on(t.siteId),
  ]
);

/** Named single-entry layouts for a post type. */
export const collectionTemplates = pgTable(
  'collection_templates',
  {
    id,
    siteId: text('site_id').notNull().default(DEFAULT_SITE_ID),
    collectionId: text('collection_id')
      .references(() => collections.id, { onDelete: 'cascade' })
      .notNull(),
    name: varchar('name', { length: 150 }).notNull(),
    description: text('description'),
    content: jsonb('content'),
    draftContent: jsonb('draft_content'),
    isDefault: boolean('is_default').default(false).notNull(),
    createdBy: text('created_by').references(() => users.id, {
      onDelete: 'set null',
    }),
    ...timestampColumns,
  },
  t => [
    uniqueIndex('collection_templates_default_unique')
      .on(t.collectionId)
      .where(sql`${t.isDefault} = true`),
    index('collection_templates_collection_id_index').on(t.collectionId),
    index('collection_templates_site_id_index').on(t.siteId),
  ]
);

/** Reusable, collection-scoped builder blocks designed in the admin UI. */
export const collectionBlocks = pgTable(
  'collection_blocks',
  {
    id,
    siteId: text('site_id').notNull().default(DEFAULT_SITE_ID),
    collectionId: text('collection_id')
      .references(() => collections.id, { onDelete: 'cascade' })
      .notNull(),
    name: varchar('name', { length: 150 }).notNull(),
    description: text('description'),
    content: jsonb('content'),
    draftContent: jsonb('draft_content'),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    createdBy: text('created_by').references(() => users.id, {
      onDelete: 'set null',
    }),
    ...timestampColumns,
  },
  t => [
    index('collection_blocks_collection_id_index').on(t.collectionId),
    index('collection_blocks_site_id_index').on(t.siteId),
  ]
);

/** One JSON entry per row, scoped to a site and collection. */
export const collectionEntries = pgTable(
  'collection_entries',
  {
    id,
    siteId: text('site_id').notNull().default(DEFAULT_SITE_ID),
    collectionId: text('collection_id')
      .references(() => collections.id, { onDelete: 'cascade' })
      .notNull(),
    slug: varchar('slug', { length: 200 }).notNull(),
    status: collectionEntryStatusEnum('status').default('draft').notNull(),
    data: jsonb('data').notNull().default({}),
    excerpt: text('excerpt'),
    featuredImage: text('featured_image'),
    authorId: text('author_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    visibility: visibilityStatusEnum('visibility')
      .default(VisibilityStatus.public)
      .notNull(),
    scheduledAt: timestamp('scheduled_at', { withTimezone: true }),
    layout: postLayoutEnum('layout').default(PostLayout.template).notNull(),
    templateId: text('template_id').references(
      (): any => collectionTemplates.id,
      { onDelete: 'set null' }
    ),
    canvas: jsonb('canvas'),
    draftCanvas: jsonb('draft_canvas'),
    seo: jsonb('seo').$type<SeoInput>(),
    /** Visitors may comment (Comments block); Settings → Single pages and post type settings can switch comments off. */
    allowComments: boolean('allow_comments').default(true).notNull(),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    /** Locale code of this entry; one row per language, like pages and posts. */
    language: text('language').default('en').notNull(),
    /** Rows that are translations of each other share this id. */
    translationGroupId: text('translation_group_id'),
    ...timestampColumns,
  },
  t => [
    uniqueIndex('collection_entries_collection_slug_language_unique')
      .on(t.collectionId, t.slug, t.language)
      .where(sql`${t.deletedAt} is null`),
    index('collection_entries_translation_group_index').on(
      t.translationGroupId
    ),
    index('collection_entries_language_index').on(t.language),
    index('collection_entries_site_id_index').on(t.siteId),
    index('collection_entries_collection_id_index').on(t.collectionId),
    index('collection_entries_status_index').on(t.status),
    index('collection_entries_template_id_index').on(t.templateId),
    index('collection_entries_author_id_index').on(t.authorId),
    index('collection_entries_scheduled_at_index').on(t.scheduledAt),
    index('collection_entries_deleted_at_index').on(t.deletedAt),
  ]
);

/** Many-to-many relationship between collection entries and taxonomy terms. */
export const collectionEntryTerms = pgTable(
  'collection_entry_terms',
  {
    entryId: text('entry_id')
      .references(() => collectionEntries.id, { onDelete: 'cascade' })
      .notNull(),
    termId: text('term_id')
      .references(() => collectionTerms.id, { onDelete: 'cascade' })
      .notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  t => [
    primaryKey({ columns: [t.entryId, t.termId] }),
    index('collection_entry_terms_term_id_index').on(t.termId),
    index('collection_entry_terms_entry_id_index').on(t.entryId),
  ]
);

export const collectionsRelations = relations(collections, ({ many }) => ({
  fields: many(collectionFields),
  entries: many(collectionEntries),
  taxonomies: many(collectionTaxonomies),
  templates: many(collectionTemplates),
  blocks: many(collectionBlocks),
}));

export const collectionFieldsRelations = relations(
  collectionFields,
  ({ one }) => ({
    collection: one(collections, {
      fields: [collectionFields.collectionId],
      references: [collections.id],
    }),
  })
);

export const collectionTaxonomiesRelations = relations(
  collectionTaxonomies,
  ({ one, many }) => ({
    collection: one(collections, {
      fields: [collectionTaxonomies.collectionId],
      references: [collections.id],
    }),
    terms: many(collectionTerms),
  })
);

export const collectionTermsRelations = relations(
  collectionTerms,
  ({ one, many }) => ({
    taxonomy: one(collectionTaxonomies, {
      fields: [collectionTerms.taxonomyId],
      references: [collectionTaxonomies.id],
    }),
    parent: one(collectionTerms, {
      fields: [collectionTerms.parentId],
      references: [collectionTerms.id],
      relationName: 'term_children',
    }),
    children: many(collectionTerms, { relationName: 'term_children' }),
    entryTerms: many(collectionEntryTerms),
  })
);

export const collectionEntryTermsRelations = relations(
  collectionEntryTerms,
  ({ one }) => ({
    entry: one(collectionEntries, {
      fields: [collectionEntryTerms.entryId],
      references: [collectionEntries.id],
    }),
    term: one(collectionTerms, {
      fields: [collectionEntryTerms.termId],
      references: [collectionTerms.id],
    }),
  })
);

export const collectionTemplatesRelations = relations(
  collectionTemplates,
  ({ one }) => ({
    collection: one(collections, {
      fields: [collectionTemplates.collectionId],
      references: [collections.id],
    }),
    creator: one(users, {
      fields: [collectionTemplates.createdBy],
      references: [users.id],
    }),
  })
);

export const collectionBlocksRelations = relations(
  collectionBlocks,
  ({ one }) => ({
    collection: one(collections, {
      fields: [collectionBlocks.collectionId],
      references: [collections.id],
    }),
    creator: one(users, {
      fields: [collectionBlocks.createdBy],
      references: [users.id],
    }),
  })
);

export const collectionEntriesRelations = relations(
  collectionEntries,
  ({ one, many }) => ({
    collection: one(collections, {
      fields: [collectionEntries.collectionId],
      references: [collections.id],
    }),
    author: one(users, {
      fields: [collectionEntries.authorId],
      references: [users.id],
    }),
    template: one(collectionTemplates, {
      fields: [collectionEntries.templateId],
      references: [collectionTemplates.id],
    }),
    terms: many(collectionEntryTerms),
  })
);

export const loopTemplateSourceEnum = pgEnum('loop_template_source', [
  'posts',
  'collection',
]);
export type LoopTemplateSource =
  (typeof loopTemplateSourceEnum.enumValues)[number];

/**
 * A reusable Loop Item design: the builder layout repeated once per item by
 * the Loop Grid block. Bound to blog posts or to one collection (post type).
 */
export const loopTemplates = pgTable(
  'loop_templates',
  {
    id,
    siteId: text('site_id').notNull().default(DEFAULT_SITE_ID),
    name: varchar('name', { length: 150 }).notNull(),
    sourceType: loopTemplateSourceEnum('source_type').default('posts').notNull(),
    collectionId: text('collection_id').references(() => collections.id, {
      onDelete: 'set null',
      onUpdate: 'cascade',
    }),
    /** Draft builder JSON (Puck-shaped, like global blocks). */
    content: jsonb('content').notNull().default({}),
    publishedContent: jsonb('published_content'),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    ...timestampColumns,
  },
  t => [
    index('loop_templates_site_id_index').on(t.siteId),
    index('loop_templates_collection_id_index').on(t.collectionId),
  ]
);

export const loopTemplatesRelations = relations(loopTemplates, ({ one }) => ({
  collection: one(collections, {
    fields: [loopTemplates.collectionId],
    references: [collections.id],
  }),
}));
