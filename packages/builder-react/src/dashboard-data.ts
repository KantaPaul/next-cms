/**
 * Widget data states for the dashboard builder (B15 E8). Every state comes
 * from a real adapter response: which widgets need a request, and how the
 * responses turn into loading, ready, empty, error and stale states. Kept
 * free of React so the rules are tested directly.
 */

import {
  checkDashboardQuery,
  type DashboardLayout,
  type DashboardQueryRequest,
  type DashboardQueryResponse,
  type DashboardResult,
  type DashboardSource,
  dashboardQueryKey,
  isEmptyDashboardResult,
} from './dashboard-adapters';

export type WidgetDataState = {
  /** Query key the shown data (or pending request) belongs to. */
  key: string;
  status: 'loading' | 'ready' | 'empty' | 'error';
  result?: DashboardResult;
  /** Query key the shown result answered; differs from `key` while a changed query loads. */
  resultKey?: string;
  /** Server time of the shown result (ISO). */
  fetchedAt?: string;
  /** Why the widget has no data (status 'error'). */
  message?: string;
  /** A request for `key` is in flight while older data is still shown. */
  refreshing?: boolean;
  /** The last refresh failed; the shown data is from an earlier response. */
  refreshError?: string;
};

export type WidgetDataStates = Record<string, WidgetDataState>;

/** Results older than this are shown as stale. */
export const DASHBOARD_STALE_AFTER_MS = 5 * 60 * 1000;

/**
 * Works out which widgets need data. Widgets whose query does not fit its
 * source get an error state at once and are never sent. `force` refetches
 * the listed widget ids even when their key is unchanged.
 */
export function planWidgetRequests(
  layout: DashboardLayout,
  states: WidgetDataStates,
  sources: readonly DashboardSource[],
  force: readonly string[] = []
): { requests: DashboardQueryRequest[]; next: WidgetDataStates } {
  const requests: DashboardQueryRequest[] = [];
  const next: WidgetDataStates = {};

  for (const widget of layout.widgets) {
    const key = dashboardQueryKey(widget.query, layout.range);
    const prev = states[widget.id];
    const invalid = checkDashboardQuery(sources, widget.query, widget.type);
    if (invalid) {
      next[widget.id] = { key, status: 'error', message: invalid };
      continue;
    }
    const unchanged = prev && prev.key === key && prev.status !== 'error';
    if (unchanged && !force.includes(widget.id)) {
      next[widget.id] = prev;
      continue;
    }
    requests.push({ key: widget.id, query: widget.query, range: layout.range });
    const hasData = prev?.result !== undefined;
    next[widget.id] = hasData
      ? { ...prev, key, refreshing: true, refreshError: undefined }
      : { key, status: 'loading' };
  }

  return { requests, next };
}

/**
 * Merges responses into the states. A response only lands when its widget
 * still wants the same query key (later edits win over slow responses). A
 * failed refresh keeps the older data and marks it, instead of blanking it.
 */
export function applyWidgetResponses(
  states: WidgetDataStates,
  requests: readonly DashboardQueryRequest[],
  responses: readonly DashboardQueryResponse[],
  range: number
): WidgetDataStates {
  const next = { ...states };
  const byKey = new Map(responses.map(r => [r.key, r]));

  for (const request of requests) {
    const key = dashboardQueryKey(request.query, range);
    const current = next[request.key];
    if (!current || current.key !== key) continue;
    const response = byKey.get(request.key);
    if (!response) {
      next[request.key] = failed(current, 'No response for this widget');
    } else if (response.status === 'error') {
      next[request.key] = failed(current, response.message);
    } else {
      next[request.key] = {
        key,
        status: isEmptyDashboardResult(response.result) ? 'empty' : 'ready',
        result: response.result,
        resultKey: key,
        fetchedAt: response.fetchedAt,
      };
    }
  }
  return next;
}

/** The whole batch failed (network, auth): every pending widget fails. */
export function failWidgetRequests(
  states: WidgetDataStates,
  requests: readonly DashboardQueryRequest[],
  range: number,
  message: string
): WidgetDataStates {
  return applyWidgetResponses(
    states,
    requests,
    requests.map(r => ({
      key: r.key,
      status: 'error' as const,
      code: 'failed' as const,
      message,
    })),
    range
  );
}

/**
 * Old data survives a failed refresh of the same query (shown as stale). A
 * failed request for a changed query is an error: the old numbers answer a
 * different question.
 */
function failed(current: WidgetDataState, message: string): WidgetDataState {
  if (current.result !== undefined && current.resultKey === current.key) {
    return { ...current, refreshing: false, refreshError: message };
  }
  return { key: current.key, status: 'error', message };
}

/** Shown data is stale: a refresh failed, or the result is old. */
export function isWidgetStale(
  state: WidgetDataState,
  now: number,
  maxAgeMs = DASHBOARD_STALE_AFTER_MS
): boolean {
  if (state.result === undefined) return false;
  if (state.refreshError) return true;
  if (!state.fetchedAt) return false;
  return now - Date.parse(state.fetchedAt) > maxAgeMs;
}

/** "just now", "3 min ago", "2 h ago". */
export function formatFetchedAgo(fetchedAt: string, now: number): string {
  const minutes = Math.floor((now - Date.parse(fetchedAt)) / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  return `${Math.floor(minutes / 60)} h ago`;
}
