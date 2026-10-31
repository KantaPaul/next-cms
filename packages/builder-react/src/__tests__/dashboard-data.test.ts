import assert from 'node:assert';
import { describe, it } from 'node:test';
import {
  checkDashboardQuery,
  type DashboardLayout,
  type DashboardQuery,
  type DashboardSource,
  dashboardQueryKey,
  dashboardSourceSchema,
  defaultQueryFor,
  isEmptyDashboardResult,
} from '../dashboard-adapters';
import {
  applyWidgetResponses,
  DASHBOARD_STALE_AFTER_MS,
  failWidgetRequests,
  formatFetchedAgo,
  isWidgetStale,
  planWidgetRequests,
} from '../dashboard-data';

const source: DashboardSource = dashboardSourceSchema.parse({
  id: 'views',
  label: 'Views',
  measures: [
    { id: 'count', label: 'Count' },
    { id: 'ratio', label: 'Ratio', widgetTypes: ['stat'] },
  ],
  dimensions: [
    { id: 'none', label: 'Total', widgetTypes: ['stat'] },
    { id: 'day', label: 'Day', widgetTypes: ['chart'] },
    { id: 'page', label: 'Page', widgetTypes: ['chart', 'table'] },
  ],
  ranges: [7, 30],
  filters: [{ id: 'pageId', label: 'Page', options: [] }],
  limits: [5, 10],
});

const stat: DashboardQuery = {
  source: 'views',
  measure: 'count',
  dimension: 'none',
  range: 'inherit',
  compare: true,
  filters: {},
};

function layoutWith(...queries: DashboardQuery[]): DashboardLayout {
  return {
    range: 30,
    widgets: queries.map((query, i) => ({
      id: `w${i}`,
      type: query.dimension === 'none' ? 'stat' : 'chart',
      span: 4,
      query,
    })),
  };
}

describe('dashboard query rules (B15 E8)', () => {
  it('accepts a query the source supports', () => {
    assert.equal(checkDashboardQuery([source], stat, 'stat'), null);
  });

  it('names what does not fit', () => {
    assert.match(
      checkDashboardQuery([source], { ...stat, source: 'nope' }) ?? '',
      /Unknown data source/
    );
    assert.match(
      checkDashboardQuery([source], { ...stat, measure: 'sql' }) ?? '',
      /not a measure/
    );
    assert.match(
      checkDashboardQuery([source], { ...stat, range: 14 }) ?? '',
      /14-day/
    );
    assert.match(
      checkDashboardQuery([source], { ...stat, filters: { x: '1' } }) ?? '',
      /not a filter/
    );
    assert.match(
      checkDashboardQuery([source], { ...stat, limit: 7 }) ?? '',
      /limit of 7/
    );
    assert.match(
      checkDashboardQuery([source], stat, 'chart') ?? '',
      /cannot be shown as a chart/
    );
    assert.match(
      checkDashboardQuery(
        [source],
        { ...stat, measure: 'ratio', dimension: 'day' },
        'chart'
      ) ?? '',
      /Ratio cannot be shown/
    );
  });

  it('builds a default query that passes its own type rules', () => {
    for (const type of ['stat', 'chart', 'table'] as const) {
      const query = defaultQueryFor(source, type);
      assert.ok(query, type);
      assert.equal(checkDashboardQuery([source], query, type), null, type);
    }
    assert.equal(defaultQueryFor(source, 'table')?.limit, 5);
  });

  it('keys equal queries equally, whatever the filter order or empty filters', () => {
    const a = { ...stat, filters: { pageId: 'p1', postId: null } };
    const b = { ...stat, filters: { postId: null, pageId: 'p1' } };
    assert.equal(dashboardQueryKey(a, 30), dashboardQueryKey(b, 30));
    assert.equal(
      dashboardQueryKey(stat, 30),
      dashboardQueryKey({ ...stat, range: 30 }, 7)
    );
    assert.notEqual(dashboardQueryKey(stat, 30), dashboardQueryKey(stat, 7));
  });

  it('treats a zero stat as a value and empty rows or series as empty', () => {
    assert.equal(
      isEmptyDashboardResult({ kind: 'stat', value: 0, previous: null }),
      false
    );
    assert.equal(isEmptyDashboardResult({ kind: 'rows', rows: [] }), true);
    assert.equal(
      isEmptyDashboardResult({
        kind: 'series',
        points: [{ label: 'a', value: 0, previous: null }],
      }),
      true
    );
  });
});

describe('widget data states (B15 E8)', () => {
  it('requests new widgets and shows them as loading', () => {
    const { requests, next } = planWidgetRequests(layoutWith(stat), {}, [
      source,
    ]);
    assert.deepEqual(requests, [{ key: 'w0', query: stat, range: 30 }]);
    assert.equal(next.w0?.status, 'loading');
  });

  it('never sends a query the source cannot answer', () => {
    const bad = { ...stat, measure: 'nope' };
    const { requests, next } = planWidgetRequests(layoutWith(bad), {}, [
      source,
    ]);
    assert.equal(requests.length, 0);
    assert.equal(next.w0?.status, 'error');
    assert.match(next.w0?.message ?? '', /not a measure/);
  });

  it('turns responses into ready and empty states', () => {
    const chart = { ...stat, dimension: 'day', compare: false };
    const layout = layoutWith(stat, chart);
    const { requests, next } = planWidgetRequests(layout, {}, [source]);
    const states = applyWidgetResponses(
      next,
      requests,
      [
        {
          key: 'w0',
          status: 'ok',
          result: { kind: 'stat', value: 3, previous: 1 },
          fetchedAt: '2026-10-31T10:00:00.000Z',
        },
        {
          key: 'w1',
          status: 'ok',
          result: { kind: 'series', points: [] },
          fetchedAt: '2026-10-31T10:00:00.000Z',
        },
      ],
      layout.range
    );
    assert.equal(states.w0?.status, 'ready');
    assert.equal(states.w0?.fetchedAt, '2026-10-31T10:00:00.000Z');
    assert.equal(states.w1?.status, 'empty');
  });

  it('skips unchanged widgets and refetches forced ones', () => {
    const layout = layoutWith(stat);
    const first = planWidgetRequests(layout, {}, [source]);
    const ready = applyWidgetResponses(
      first.next,
      first.requests,
      [
        {
          key: 'w0',
          status: 'ok',
          result: { kind: 'stat', value: 1, previous: null },
          fetchedAt: new Date().toISOString(),
        },
      ],
      30
    );
    assert.equal(
      planWidgetRequests(layout, ready, [source]).requests.length,
      0
    );
    const forced = planWidgetRequests(layout, ready, [source], ['w0']);
    assert.equal(forced.requests.length, 1);
    assert.equal(forced.next.w0?.refreshing, true);
    assert.equal(
      forced.next.w0?.status,
      'ready',
      'keeps showing the old value'
    );
  });

  it('drops a response for a query the widget no longer has', () => {
    const layout = layoutWith(stat);
    const { requests, next } = planWidgetRequests(layout, {}, [source]);
    const edited = planWidgetRequests(
      layoutWith({ ...stat, measure: 'ratio' }),
      next,
      [source]
    );
    const states = applyWidgetResponses(
      edited.next,
      requests,
      [
        {
          key: 'w0',
          status: 'ok',
          result: { kind: 'stat', value: 9, previous: null },
          fetchedAt: new Date().toISOString(),
        },
      ],
      30
    );
    assert.equal(states.w0?.status, 'loading');
    assert.equal(states.w0?.result, undefined);
  });

  it('shows an error without data, and stale data after a failed refresh', () => {
    const layout = layoutWith(stat);
    const first = planWidgetRequests(layout, {}, [source]);
    const failed = failWidgetRequests(
      first.next,
      first.requests,
      30,
      'Network down'
    );
    assert.equal(failed.w0?.status, 'error');
    assert.equal(failed.w0?.message, 'Network down');

    const retry = planWidgetRequests(layout, failed, [source]);
    assert.equal(retry.requests.length, 1, 'an errored widget is asked again');
    const ready = applyWidgetResponses(
      retry.next,
      retry.requests,
      [
        {
          key: 'w0',
          status: 'ok',
          result: { kind: 'stat', value: 5, previous: null },
          fetchedAt: new Date().toISOString(),
        },
      ],
      30
    );
    const refresh = planWidgetRequests(layout, ready, [source], ['w0']);
    const stale = applyWidgetResponses(
      refresh.next,
      refresh.requests,
      [{ key: 'w0', status: 'error', code: 'failed', message: 'Timeout' }],
      30
    );
    assert.equal(stale.w0?.status, 'ready');
    assert.equal(stale.w0?.refreshError, 'Timeout');
    assert.equal(isWidgetStale(stale.w0!, Date.now()), true);
  });

  it('shows an error, not old numbers, when a changed query fails', () => {
    const first = planWidgetRequests(layoutWith(stat), {}, [source]);
    const ready = applyWidgetResponses(
      first.next,
      first.requests,
      [
        {
          key: 'w0',
          status: 'ok',
          result: { kind: 'stat', value: 5, previous: null },
          fetchedAt: new Date().toISOString(),
        },
      ],
      30
    );
    const changed = planWidgetRequests(
      layoutWith({ ...stat, range: 7 }),
      ready,
      [source]
    );
    assert.equal(
      changed.next.w0?.refreshing,
      true,
      'old value shown while loading'
    );
    const failed = failWidgetRequests(
      changed.next,
      changed.requests,
      30,
      'Offline'
    );
    assert.equal(failed.w0?.status, 'error');
    assert.equal(failed.w0?.result, undefined);
  });

  it('marks a missing response as an error', () => {
    const { requests, next } = planWidgetRequests(layoutWith(stat), {}, [
      source,
    ]);
    const states = applyWidgetResponses(next, requests, [], 30);
    assert.equal(states.w0?.status, 'error');
  });

  it('calls old results stale by their server time', () => {
    const fetchedAt = '2026-10-31T10:00:00.000Z';
    const at = Date.parse(fetchedAt);
    const state = {
      key: 'k',
      status: 'ready' as const,
      result: { kind: 'stat' as const, value: 1, previous: null },
      fetchedAt,
    };
    assert.equal(isWidgetStale(state, at + 1000), false);
    assert.equal(isWidgetStale(state, at + DASHBOARD_STALE_AFTER_MS + 1), true);
    assert.equal(formatFetchedAgo(fetchedAt, at + 30_000), 'just now');
    assert.equal(formatFetchedAgo(fetchedAt, at + 7 * 60_000), '7 min ago');
    assert.equal(formatFetchedAgo(fetchedAt, at + 125 * 60_000), '2 h ago');
  });
});
