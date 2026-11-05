import { relations, sql } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core';
import { baseColumns, relationConfig } from '@/db/helpers/base.columns';
import { DEFAULT_SITE_ID } from '@/db/schemas/sites.schema';
import { pages } from '@/db/schemas/pages.schema';

const { id, ...timestampColumns } = baseColumns;
const { cascade } = relationConfig;

export const collectionStatusEnum = pgEnum('collection_status', [
  'active',
  'archived',
]);
export type CollectionStatus = (typeof collectionStatusEnum.enumValues)[number];

export const collectionEntryStatusEnum = pgEnum('collection_entry_status', [
  'draft',
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
    publishedAt: timestamp('published_at', { withTimezone: true }),
    ...timestampColumns,
  },
  t => [
    uniqueIndex('collection_entries_collection_slug_unique')
      .on(t.collectionId, t.slug)
      .where(sql`${t.deletedAt} is null`),
    index('collection_entries_site_id_index').on(t.siteId),
    index('collection_entries_collection_id_index').on(t.collectionId),
    index('collection_entries_status_index').on(t.status),
    index('collection_entries_deleted_at_index').on(t.deletedAt),
  ]
);

export const collectionsRelations = relations(collections, ({ many }) => ({
  fields: many(collectionFields),
  entries: many(collectionEntries),
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

export const collectionEntriesRelations = relations(
  collectionEntries,
  ({ one }) => ({
    collection: one(collections, {
      fields: [collectionEntries.collectionId],
      references: [collections.id],
    }),
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
