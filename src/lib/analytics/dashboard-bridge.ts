/**
 * Bridge between the dashboard builder's adapter contract
 * (`@nextcms/builder-react` dashboard-adapters) and the CMS analytics model
 * (`analytics.schema.ts`), B15 E8. Pure: no database, no request context,
 * so the server actions and the contract tests share it.
 */

import {
  checkDashboardQuery,
  type DashboardLayout,
  type DashboardQuery,
  type DashboardQueryResponse,
  type DashboardRecord,
  type DashboardSource,
  dashboardQueryBatchSchema,
  dashboardQueryKey,
} from '@nextcms/builder-react/dashboard';
import {
  type BoardLayout,
  boardLayoutSchema,
  type WidgetQuery,
  widgetQuerySchema,
} from '@/db/schemas/analytics.schema';

/** The one data source the CMS offers today: page and post views. */
export const PAGE_VIEWS_SOURCE_ID = 'pageViews';

/** Widget sizes and count the analytics boards store. */
export const BOARD_WIDGET_SPANS = [4, 6, 12];
export const BOARD_MAX_WIDGETS = 12;

type ContentOption = { id: string; title: string };

/**
 * The page-views source. Measures and dimensions carry the same widget-type
 * rules as `widgetSchema` (a stat needs no dimension, views per visitor is
 * stat only, tables group by page, path or referrer).
 */
export function pageViewsSource(content: {
  pages: ContentOption[];
  posts: ContentOption[];
}): DashboardSource {
  return {
    id: PAGE_VIEWS_SOURCE_ID,
    label: 'Page views',
    measures: [
      { id: 'views', label: 'Views' },
      { id: 'uniqueVisitors', label: 'Unique visitors' },
      {
        id: 'viewsPerVisitor',
        label: 'Views per visitor',
        widgetTypes: ['stat'],
      },
    ],
    dimensions: [
      { id: 'none', label: 'Total', widgetTypes: ['stat'] },
      { id: 'day', label: 'Day', widgetTypes: ['chart'] },
      { id: 'page', label: 'Page', widgetTypes: ['chart', 'table'] },
      { id: 'path', label: 'Path', widgetTypes: ['chart', 'table'] },
      { id: 'referrer', label: 'Referrer', widgetTypes: ['chart', 'table'] },
    ],
    ranges: [7, 30],
    filters: [
      {
        id: 'pageId',
        label: 'Page',
        options: content.pages.map(p => ({ value: p.id, label: p.title })),
      },
      {
        id: 'postId',
        label: 'Post',
        options: content.posts.map(p => ({ value: p.id, label: p.title })),
      },
    ],
    limits: [5, 10, 20],
  };
}

// ─── Layout mapping ──────────────────────────────────────────────────────────

export function toDashboardQuery(query: WidgetQuery): DashboardQuery {
  const filters: Record<string, string | null> = {};
  if (query.pageId) filters.pageId = query.pageId;
  if (query.postId) filters.postId = query.postId;
  return {
    source: PAGE_VIEWS_SOURCE_ID,
    measure: query.metric,
    dimension: query.dimension,
    range: query.range,
    compare: query.compare,
    filters,
    ...(query.limit !== undefined && { limit: query.limit }),
  };
}

/** The analytics form of a query, or a reason it has none. */
export function toWidgetQuery(
  query: DashboardQuery
): { ok: true; query: WidgetQuery } | { ok: false; message: string } {
  if (query.source !== PAGE_VIEWS_SOURCE_ID) {
    return { ok: false, message: `Unknown data source "${query.source}"` };
  }
  const parsed = widgetQuerySchema.safeParse({
    metric: query.measure,
    dimension: query.dimension,
    compare: query.compare,
    range: query.range,
    pageId: query.filters.pageId || null,
    postId: query.filters.pageId ? null : query.filters.postId || null,
    ...(query.limit !== undefined && { limit: query.limit }),
  });
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? 'Invalid query',
    };
  }
  return { ok: true, query: parsed.data };
}

export function toDashboardLayout(board: BoardLayout): DashboardLayout {
  return {
    range: board.range,
    widgets: board.widgets.map(w => ({
      id: w.id,
      type: w.type,
      span: w.span,
      ...(w.title !== undefined && { title: w.title }),
      query: toDashboardQuery(w.query),
    })),
  };
}

/** The stored form of a layout, or the first reason it cannot be stored. */
export function toBoardLayout(
  layout: DashboardLayout
): { ok: true; layout: BoardLayout } | { ok: false; message: string } {
  const widgets = [];
  for (const widget of layout.widgets) {
    const mapped = toWidgetQuery(widget.query);
    if (!mapped.ok)
      return { ok: false, message: `${label(widget)}: ${mapped.message}` };
    widgets.push({
      id: widget.id,
      type: widget.type,
      span: widget.span,
      ...(widget.title !== undefined && { title: widget.title }),
      query: mapped.query,
    });
  }
  const parsed = boardLayoutSchema.safeParse({ range: layout.range, widgets });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const index = issue?.path[1];
    const widget =
      typeof index === 'number' ? layout.widgets[index] : undefined;
    const prefix = widget ? `${label(widget)}: ` : '';
    return {
      ok: false,
      message: `${prefix}${issue?.message ?? 'Invalid layout'}`,
    };
  }
  return { ok: true, layout: parsed.data };
}

function label(widget: DashboardLayout['widgets'][number]) {
  return widget.title?.trim() || `Widget ${widget.id}`;
}

export function toDashboardRecord(board: {
  id: string;
  name: string;
  layout: BoardLayout;
  version: number;
  updatedAt: Date | null;
}): DashboardRecord {
  return {
    id: board.id,
    name: board.name,
    layout: toDashboardLayout(board.layout),
    version: board.version,
    updatedAt: board.updatedAt ? board.updatedAt.toISOString() : null,
  };
}

// ─── Batched structured queries ──────────────────────────────────────────────

export type ExecutedWidgetQuery = {
  result: Extract<DashboardQueryResponse, { status: 'ok' }>['result'];
  fetchedAt: string;
};

/**
 * Runs one batch of structured queries. Each request is checked against the
 * sources and the analytics schema; a bad one gets its own `invalid` error
 * and is never executed. Identical queries in the batch run once. A query
 * that throws gets a `failed` error without failing the others; the real
 * error goes to `onError`, the client only sees a generic message.
 */
export async function runDashboardQueries(
  raw: unknown,
  deps: {
    sources: readonly DashboardSource[];
    execute: (
      query: WidgetQuery,
      boardRange: 7 | 30
    ) => Promise<ExecutedWidgetQuery>;
    onError?: (error: unknown, request: { key: string }) => void;
  }
): Promise<DashboardQueryResponse[]> {
  const batch = dashboardQueryBatchSchema.parse(raw);
  const running = new Map<string, Promise<ExecutedWidgetQuery>>();

  return Promise.all(
    batch.map(async (request): Promise<DashboardQueryResponse> => {
      const invalid = (message: string): DashboardQueryResponse => ({
        key: request.key,
        status: 'error',
        code: 'invalid',
        message,
      });
      const problem = checkDashboardQuery(deps.sources, request.query);
      if (problem) return invalid(problem);
      if (request.range !== 7 && request.range !== 30) {
        return invalid(`Dashboards cover 7 or 30 days, not ${request.range}`);
      }
      const mapped = toWidgetQuery(request.query);
      if (!mapped.ok) return invalid(mapped.message);

      const key = dashboardQueryKey(request.query, request.range);
      let pending = running.get(key);
      if (!pending) {
        pending = deps.execute(mapped.query, request.range);
        running.set(key, pending);
      }
      try {
        const { result, fetchedAt } = await pending;
        return { key: request.key, status: 'ok', result, fetchedAt };
      } catch (error) {
        deps.onError?.(error, request);
        return {
          key: request.key,
          status: 'error',
          code: 'failed',
          message: 'Could not load data for this widget',
        };
      }
    })
  );
}
