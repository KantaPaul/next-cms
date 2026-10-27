import { relations } from 'drizzle-orm';
import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  unique,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core';
import { z } from 'zod';
import { baseColumns, relationConfig } from '@/db/helpers/base.columns';
import { users } from '@/db/schemas/auth.schema';
import { DEFAULT_SITE_ID } from '@/db/schemas/sites.schema';
import { pages } from '@/db/schemas/pages.schema';

const { id, ...timestampColumns } = baseColumns;
const { setNull } = relationConfig;

/** Named, shared analytics dashboards (drag-and-drop widget grids). */
export const analyticsDashboards = pgTable(
  'analytics_dashboards',
  {
    id,
    siteId: text('site_id').notNull().default(DEFAULT_SITE_ID),
    name: varchar('name', { length: 120 }).notNull(),
    createdBy: text('created_by').references(() => users.id, setNull),
    layout: jsonb('layout').notNull(),
    ...timestampColumns,
  },
  t => [
    index('analytics_dashboards_updated_at_index').on(t.updatedAt),
    index('analytics_dashboards_site_id_index').on(t.siteId),
  ]
);

export const analyticsDashboardsRelations = relations(
  analyticsDashboards,
  ({ one }) => ({
    creator: one(users, {
      fields: [analyticsDashboards.createdBy],
      references: [users.id],
    }),
  })
);

// ─── Layout document (validated on every write / read) ───────────────────────

export const widgetMetricSchema = z.enum([
  'views',
  'uniqueVisitors',
  'viewsPerVisitor',
]);
export type WidgetMetric = z.infer<typeof widgetMetricSchema>;

export const widgetDimensionSchema = z.enum([
  'none',
  'day',
  'page',
  'path',
  'referrer',
]);
export type WidgetDimension = z.infer<typeof widgetDimensionSchema>;

export const widgetTypeSchema = z.enum(['stat', 'chart', 'table']);
export type WidgetType = z.infer<typeof widgetTypeSchema>;

export const widgetSpanSchema = z.union([
  z.literal(4),
  z.literal(6),
  z.literal(12),
]);
export type WidgetSpan = z.infer<typeof widgetSpanSchema>;

export const widgetRangeSchema = z.union([
  z.literal('inherit'),
  z.literal(7),
  z.literal(30),
]);
export type WidgetRange = z.infer<typeof widgetRangeSchema>;

export const widgetLimitSchema = z.union([
  z.literal(5),
  z.literal(10),
  z.literal(20),
]);

export const widgetQuerySchema = z.object({
  metric: widgetMetricSchema,
  dimension: widgetDimensionSchema,
  compare: z.boolean(),
  range: widgetRangeSchema,
  pageId: z.string().nullable(),
  /** Set instead of pageId to scope a widget to one post. Omitted on older boards. */
  postId: z.string().nullable().optional(),
  limit: widgetLimitSchema.optional(),
});
export type WidgetQuery = z.infer<typeof widgetQuerySchema>;

export const widgetSchema = z
  .object({
    id: z.string().min(1),
    type: widgetTypeSchema,
    span: widgetSpanSchema,
    title: z.string().max(80).optional(),
    query: widgetQuerySchema,
  })
  .superRefine((w, ctx) => {
    const { type, query } = w;
    const { metric, dimension } = query;

    if (type === 'stat') {
      if (dimension !== 'none') {
        ctx.addIssue({
          code: 'custom',
          message: 'Stat widgets require dimension: none',
          path: ['query', 'dimension'],
        });
      }
    } else if (type === 'chart') {
      if (dimension === 'none') {
        ctx.addIssue({
          code: 'custom',
          message: 'Chart widgets require a non-none dimension',
          path: ['query', 'dimension'],
        });
      }
      if (metric === 'viewsPerVisitor') {
        ctx.addIssue({
          code: 'custom',
          message: 'viewsPerVisitor is only valid on stat widgets',
          path: ['query', 'metric'],
        });
      }
    } else if (type === 'table') {
      if (dimension === 'none' || dimension === 'day') {
        ctx.addIssue({
          code: 'custom',
          message: 'Table widgets require page, path, or referrer dimension',
          path: ['query', 'dimension'],
        });
      }
      if (metric === 'viewsPerVisitor') {
        ctx.addIssue({
          code: 'custom',
          message: 'viewsPerVisitor is only valid on stat widgets',
          path: ['query', 'metric'],
        });
      }
    }
  });
export type DashboardWidget = z.infer<typeof widgetSchema>;

export const boardLayoutSchema = z.object({
  range: z.union([z.literal(7), z.literal(30)]),
  widgets: z.array(widgetSchema).max(12),
});
export type BoardLayout = z.infer<typeof boardLayoutSchema>;

/** Parse and sanitize a layout; drops invalid widgets on read. */
export function parseBoardLayout(raw: unknown): BoardLayout {
  const base = z
    .object({
      range: z.union([z.literal(7), z.literal(30)]).default(30),
      widgets: z.array(z.unknown()).default([]),
    })
    .safeParse(raw);

  if (!base.success) {
    return { range: 30, widgets: [] };
  }

  const widgets: DashboardWidget[] = [];
  for (const item of base.data.widgets) {
    const parsed = widgetSchema.safeParse(item);
    if (parsed.success) widgets.push(parsed.data);
    if (widgets.length >= 12) break;
  }

  return { range: base.data.range, widgets };
}

export function defaultWidgetTitle(w: DashboardWidget): string {
  if (w.title?.trim()) return w.title.trim();
  const metric =
    w.query.metric === 'uniqueVisitors'
      ? 'Unique visitors'
      : w.query.metric === 'viewsPerVisitor'
        ? 'Views per visitor'
        : 'Views';
  if (w.query.dimension === 'none') return metric;
  const dim =
    w.query.dimension === 'day'
      ? 'day'
      : w.query.dimension === 'page'
        ? 'page'
        : w.query.dimension === 'path'
          ? 'path'
          : 'referrer';
  return `${metric} by ${dim}`;
}

export const EMPTY_LAYOUT: BoardLayout = { range: 30, widgets: [] };

/** One A/B variant per published page. Posts are not included. */
export const pageExperiments = pgTable(
  'page_experiments',
  {
    id,
    siteId: text('site_id').notNull().default(DEFAULT_SITE_ID),
    pageId: text('page_id')
      .references(() => pages.id, { onDelete: 'cascade' })
      .notNull(),
    variantContent: jsonb('variant_content').notNull(),
    weight: integer('weight').notNull().default(50),
    status: varchar('status', { length: 20 }).notNull().default('draft'),
    ...timestampColumns,
  },
  t => [
    unique('page_experiments_page_id_unique').on(t.pageId),
    index('page_experiments_site_id_index').on(t.siteId),
  ]
);

export const pageExperimentsRelations = relations(
  pageExperiments,
  ({ one }) => ({
    page: one(pages, { fields: [pageExperiments.pageId], references: [pages.id] }),
  })
);
