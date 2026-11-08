import { relations } from 'drizzle-orm';
import {
  date,
  index,
  integer,
  pgTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { baseColumns, relationConfig } from '@/db/helpers/base.columns';
import { globalBlocks } from '@/db/schemas/pages.schema';
import { DEFAULT_SITE_ID } from '@/db/schemas/sites.schema';

const { id, ...timestampColumns } = baseColumns;
const { cascade } = relationConfig;

/**
 * Daily rollup counters for Popups and Drawers.
 * Upserted on /api/overlays/[id]/event via INSERT ... ON CONFLICT DO UPDATE.
 */
export const overlayStats = pgTable(
  'overlay_stats',
  {
    id,
    overlayId: text('overlay_id')
      .notNull()
      .references(() => globalBlocks.id, cascade),
    siteId: text('site_id').notNull().default(DEFAULT_SITE_ID),
    day: date('day', { mode: 'string' }).notNull(),
    views: integer('views').default(0).notNull(),
    closes: integer('closes').default(0).notNull(),
    conversions: integer('conversions').default(0).notNull(),
    ...timestampColumns,
  },
  t => [
    uniqueIndex('overlay_stats_overlay_day_unique').on(t.overlayId, t.day),
    index('overlay_stats_site_id_index').on(t.siteId),
  ]
);

export const overlayStatsRelations = relations(overlayStats, ({ one }) => ({
  overlay: one(globalBlocks, {
    fields: [overlayStats.overlayId],
    references: [globalBlocks.id],
  }),
}));

export type OverlayStatRecord = typeof overlayStats.$inferSelect;
export type NewOverlayStatRecord = typeof overlayStats.$inferInsert;
