/**
 * Dashboard adapter contracts (B15 E8, R685 / R738 / R788): the host gives
 * the dashboard builder a storage adapter (load, save with a version check)
 * and a data adapter (the sources it may query, and one batched structured
 * query call). Queries are data, never free-text SQL: a source, a measure,
 * a dimension, a range and named filters, checked against what the source
 * says it supports.
 *
 * Every shape is a Zod schema, so hosts validate what crosses the wire and
 * the contract tests check adapters against the same definitions.
 */

import { z } from 'zod';

// ─── Widgets and layout ──────────────────────────────────────────────────────

export const dashboardWidgetTypeSchema = z.enum(['stat', 'chart', 'table']);
export type DashboardWidgetType = z.infer<typeof dashboardWidgetTypeSchema>;

export const dashboardQuerySchema = z.object({
  source: z.string().min(1).max(64),
  measure: z.string().min(1).max(64),
  dimension: z.string().min(1).max(64),
  /** Days, or 'inherit' to use the dashboard's range. */
  range: z.union([z.literal('inherit'), z.number().int().min(1).max(366)]),
  compare: z.boolean(),
  /** Named filters the source declares, e.g. `{ pageId: 'abc' }`. */
  filters: z.record(z.string(), z.string().nullable()),
  limit: z.number().int().min(1).max(100).optional(),
});
export type DashboardQuery = z.infer<typeof dashboardQuerySchema>;

export const dashboardWidgetSchema = z.object({
  id: z.string().min(1).max(64),
  type: dashboardWidgetTypeSchema,
  span: z.number().int().min(1).max(12),
  title: z.string().max(80).optional(),
  query: dashboardQuerySchema,
});
export type DashboardWidget = z.infer<typeof dashboardWidgetSchema>;

export const dashboardLayoutSchema = z.object({
  /** Default range in days for widgets set to 'inherit'. */
  range: z.number().int().min(1).max(366),
  widgets: z.array(dashboardWidgetSchema).max(50),
});
export type DashboardLayout = z.infer<typeof dashboardLayoutSchema>;

// ─── Storage ─────────────────────────────────────────────────────────────────

export const dashboardRecordSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(120),
  layout: dashboardLayoutSchema,
  /** Bumped by every save; saves send the version they started from. */
  version: z.number().int().min(0),
  updatedAt: z.string().nullable(),
});
export type DashboardRecord = z.infer<typeof dashboardRecordSchema>;

export const dashboardSaveInputSchema = z.object({
  name: z.string().trim().min(1).max(120),
  layout: dashboardLayoutSchema,
});
export type DashboardSaveInput = z.infer<typeof dashboardSaveInputSchema>;

export const dashboardSaveResultSchema = z.discriminatedUnion('status', [
  z.object({
    status: z.literal('saved'),
    version: z.number().int().min(0),
    updatedAt: z.string().nullable(),
  }),
  /** Someone saved first; `current` is what is stored now. */
  z.object({ status: z.literal('conflict'), current: dashboardRecordSchema }),
]);
export type DashboardSaveResult = z.infer<typeof dashboardSaveResultSchema>;

export type DashboardStorageAdapter = {
  load: (id: string) => Promise<DashboardRecord>;
  save: (
    id: string,
    input: DashboardSaveInput,
    expectedVersion: number
  ) => Promise<DashboardSaveResult>;
};

// ─── Data sources and queries ────────────────────────────────────────────────

const optionSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  /** Widget types this option may be used with; all types when omitted. */
  widgetTypes: z.array(dashboardWidgetTypeSchema).optional(),
});
export type DashboardSourceOption = z.infer<typeof optionSchema>;

export const dashboardSourceSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  measures: z.array(optionSchema).min(1),
  dimensions: z.array(optionSchema).min(1),
  /** Ranges in days the source can answer. */
  ranges: z.array(z.number().int().min(1)).min(1),
  filters: z
    .array(
      z.object({
        id: z.string().min(1),
        label: z.string().min(1),
        options: z.array(z.object({ value: z.string(), label: z.string() })),
      })
    )
    .default([]),
  limits: z.array(z.number().int().min(1)).default([]),
});
export type DashboardSource = z.infer<typeof dashboardSourceSchema>;

export const dashboardQueryRequestSchema = z.object({
  /** Caller's key, echoed back (usually the widget id). */
  key: z.string().min(1).max(64),
  query: dashboardQuerySchema,
  /** The dashboard's range, used when the query says 'inherit'. */
  range: z.number().int().min(1).max(366),
});
export type DashboardQueryRequest = z.infer<typeof dashboardQueryRequestSchema>;

/** Most requests one query call may carry. */
export const DASHBOARD_QUERY_BATCH_LIMIT = 50;

export const dashboardQueryBatchSchema = z
  .array(dashboardQueryRequestSchema)
  .max(DASHBOARD_QUERY_BATCH_LIMIT);

export const dashboardResultSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('stat'),
    value: z.number(),
    previous: z.number().nullable(),
  }),
  z.object({
    kind: z.literal('series'),
    points: z.array(
      z.object({
        label: z.string(),
        value: z.number(),
        previous: z.number().nullable(),
      })
    ),
  }),
  z.object({
    kind: z.literal('rows'),
    rows: z.array(
      z.object({
        key: z.string(),
        label: z.string(),
        detail: z.string().nullable(),
        value: z.number(),
        previous: z.number().nullable(),
      })
    ),
  }),
]);
export type DashboardResult = z.infer<typeof dashboardResultSchema>;

export const dashboardQueryResponseSchema = z.discriminatedUnion('status', [
  z.object({
    key: z.string(),
    status: z.literal('ok'),
    result: dashboardResultSchema,
    /** When the server computed this result (ISO); older when cached. */
    fetchedAt: z.string(),
  }),
  z.object({
    key: z.string(),
    status: z.literal('error'),
    /** 'invalid': the query does not fit the source. 'failed': it could not run. */
    code: z.enum(['invalid', 'failed']),
    message: z.string(),
  }),
]);
export type DashboardQueryResponse = z.infer<
  typeof dashboardQueryResponseSchema
>;

export type DashboardDataAdapter = {
  listSources: () => Promise<DashboardSource[]>;
  /** One call per batch; one response per request, matched by `key`. */
  query: (
    requests: DashboardQueryRequest[]
  ) => Promise<DashboardQueryResponse[]>;
};

export type DashboardAdapters = {
  storage: DashboardStorageAdapter;
  data: DashboardDataAdapter;
};

// ─── Helpers shared by hosts and the builder ─────────────────────────────────

function allows(option: DashboardSourceOption, type: DashboardWidgetType) {
  return !option.widgetTypes || option.widgetTypes.includes(type);
}

/** Measures and dimensions of a source usable by a widget type. */
export function sourceOptionsFor(
  source: DashboardSource,
  type: DashboardWidgetType
) {
  return {
    measures: source.measures.filter(m => allows(m, type)),
    dimensions: source.dimensions.filter(d => allows(d, type)),
  };
}

/**
 * Checks a query against the source it names. Returns a reason when the
 * source cannot answer it, `null` when it can. `type` adds the widget-type
 * rules (a stat needs a stat dimension, and so on).
 */
export function checkDashboardQuery(
  sources: readonly DashboardSource[],
  query: DashboardQuery,
  type?: DashboardWidgetType
): string | null {
  const source = sources.find(s => s.id === query.source);
  if (!source) return `Unknown data source "${query.source}"`;
  const measure = source.measures.find(m => m.id === query.measure);
  if (!measure) return `"${query.measure}" is not a measure of ${source.label}`;
  const dimension = source.dimensions.find(d => d.id === query.dimension);
  if (!dimension)
    return `"${query.dimension}" is not a dimension of ${source.label}`;
  if (query.range !== 'inherit' && !source.ranges.includes(query.range))
    return `${source.label} has no ${query.range}-day range`;
  for (const key of Object.keys(query.filters)) {
    if (!source.filters.some(f => f.id === key))
      return `"${key}" is not a filter of ${source.label}`;
  }
  if (query.limit !== undefined && !source.limits.includes(query.limit))
    return `${source.label} does not support a limit of ${query.limit}`;
  if (type) {
    if (!allows(measure, type))
      return `${measure.label} cannot be shown as a ${type}`;
    if (!allows(dimension, type))
      return `${dimension.label} cannot be shown as a ${type}`;
  }
  return null;
}

/** A query usable by a new widget of `type`, or null when none fits. */
export function defaultQueryFor(
  source: DashboardSource,
  type: DashboardWidgetType
): DashboardQuery | null {
  const { measures, dimensions } = sourceOptionsFor(source, type);
  if (!measures[0] || !dimensions[0]) return null;
  return {
    source: source.id,
    measure: measures[0].id,
    dimension: dimensions[0].id,
    range: 'inherit',
    compare: type === 'stat',
    filters: {},
    limit:
      type === 'table' && source.limits.length ? source.limits[0] : undefined,
  };
}

/** Stable identity of a query at a range; equal keys give equal results. */
export function dashboardQueryKey(
  query: DashboardQuery,
  range: number
): string {
  const days = query.range === 'inherit' ? range : query.range;
  const filters = Object.keys(query.filters)
    .sort()
    .filter(k => query.filters[k] !== null && query.filters[k] !== '')
    .map(k => `${k}=${query.filters[k]}`)
    .join('&');
  return [
    query.source,
    query.measure,
    query.dimension,
    days,
    query.compare ? 1 : 0,
    filters,
    query.limit ?? '',
  ].join('|');
}

/** True when a successful result has nothing to show. A stat of 0 is a value. */
export function isEmptyDashboardResult(result: DashboardResult): boolean {
  if (result.kind === 'series')
    return result.points.every(p => p.value === 0 && !p.previous);
  if (result.kind === 'rows') return result.rows.length === 0;
  return false;
}
