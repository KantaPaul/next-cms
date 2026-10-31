/**
 * Widget bodies for the dashboard builder (B15 E8): what a widget shows for
 * each data state, all driven by adapter responses (see dashboard-data.ts).
 * Inline styles on `--ne-*` tokens, like the rest of builder-react: the
 * editor-ui stylesheet only compiles classes used inside editor-ui.
 */

import { ErrorState, LoadingSkeleton, StaleNotice } from '@nextcms/editor-ui';
import type { CSSProperties } from 'react';
import type { DashboardResult, DashboardWidget } from './dashboard-adapters';
import {
  formatFetchedAgo,
  isWidgetStale,
  type WidgetDataState,
} from './dashboard-data';

const numberFormat = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 1,
});

const muted: CSSProperties = { color: 'var(--ne-text-muted)', fontSize: 12 };
const text: CSSProperties = { color: 'var(--ne-text)', fontSize: 12 };

function Delta({
  value,
  previous,
}: {
  value: number;
  previous: number | null;
}) {
  if (previous === null) return null;
  if (previous === 0) {
    return <span style={muted}>{value === 0 ? 'No change' : 'New'}</span>;
  }
  const change = ((value - previous) / previous) * 100;
  return (
    <span
      style={{
        fontSize: 12,
        color: change >= 0 ? 'var(--ne-success)' : 'var(--ne-danger)',
      }}
    >
      {change >= 0 ? '+' : ''}
      {numberFormat.format(change)}% vs previous period
    </span>
  );
}

/** Longer series (days of a month) read better as columns than as rows. */
const COLUMN_CHART_FROM = 12;

type SeriesPoint = Extract<
  DashboardResult,
  { kind: 'series' }
>['points'][number];

function ColumnChart({ points }: { points: SeriesPoint[] }) {
  const max = Math.max(1, ...points.map(p => p.value));
  const total = points.reduce((sum, p) => sum + p.value, 0);
  return (
    <figure style={{ margin: 0, display: 'grid', gap: 4 }}>
      <div
        role="img"
        aria-label={`${points.length} values from ${points[0]?.label} to ${points.at(-1)?.label}, ${numberFormat.format(total)} in total`}
        style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 96 }}
      >
        {points.map((point, i) => (
          <span
            key={`${i}:${point.label}`}
            aria-hidden="true"
            title={`${point.label}: ${numberFormat.format(point.value)}`}
            style={{
              flex: 1,
              minWidth: 0,
              height: `${Math.max(2, (point.value / max) * 100)}%`,
              borderRadius: 2,
              background:
                point.value > 0
                  ? 'var(--ne-primary)'
                  : 'var(--ne-surface-subtle)',
            }}
          />
        ))}
      </div>
      <figcaption
        style={{ ...muted, display: 'flex', justifyContent: 'space-between' }}
      >
        <span>{points[0]?.label}</span>
        <span>{points.at(-1)?.label}</span>
      </figcaption>
    </figure>
  );
}

function ResultView({ result }: { result: DashboardResult }) {
  if (result.kind === 'stat') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span
          style={{ color: 'var(--ne-text)', fontSize: 28, fontWeight: 600 }}
        >
          {numberFormat.format(result.value)}
        </span>
        <Delta value={result.value} previous={result.previous} />
      </div>
    );
  }

  if (result.kind === 'series' && result.points.length > COLUMN_CHART_FROM) {
    return <ColumnChart points={result.points} />;
  }

  if (result.kind === 'series') {
    const max = Math.max(1, ...result.points.map(p => p.value));
    return (
      <ul
        aria-label="Series"
        style={{
          display: 'grid',
          gap: 4,
          margin: 0,
          padding: 0,
          listStyle: 'none',
        }}
      >
        {result.points.map((point, i) => (
          <li
            key={`${i}:${point.label}`}
            style={{ display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <span
              style={{
                ...muted,
                width: 96,
                flexShrink: 0,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {point.label}
            </span>
            <span
              style={{
                position: 'relative',
                flex: 1,
                height: 8,
                borderRadius: 'var(--ne-radius-sm)',
                background: 'var(--ne-surface-subtle)',
              }}
            >
              <span
                style={{
                  position: 'absolute',
                  insetBlock: 0,
                  insetInlineStart: 0,
                  width: `${(point.value / max) * 100}%`,
                  borderRadius: 'var(--ne-radius-sm)',
                  background: 'var(--ne-primary)',
                }}
              />
            </span>
            <span
              style={{
                ...text,
                width: 48,
                flexShrink: 0,
                textAlign: 'end',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {numberFormat.format(point.value)}
            </span>
          </li>
        ))}
      </ul>
    );
  }

  // Analytics can list one page twice (one row per path), so keys include the position.
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <tbody>
        {result.rows.map((row, i) => (
          <tr
            key={`${i}:${row.key}`}
            style={{ borderBottom: '1px solid var(--ne-border)' }}
          >
            <td
              style={{
                ...text,
                padding: '4px 8px 4px 0',
                maxWidth: 0,
                width: '100%',
              }}
            >
              <div
                style={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {row.label}
              </div>
              {row.detail && (
                <div
                  style={{
                    ...muted,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {row.detail}
                </div>
              )}
            </td>
            <td
              style={{
                ...text,
                padding: '4px 0',
                textAlign: 'end',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {numberFormat.format(row.value)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export type DashboardWidgetBodyProps = {
  widget: DashboardWidget;
  state: WidgetDataState | undefined;
  now: number;
  onRefresh: () => void;
};

export function DashboardWidgetBody({
  widget,
  state,
  now,
  onRefresh,
}: DashboardWidgetBodyProps) {
  if (!state || state.status === 'loading') {
    return (
      <div aria-busy="true" aria-label="Loading data">
        <LoadingSkeleton lines={widget.type === 'stat' ? 2 : 4} />
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <ErrorState
        title="Couldn't load data"
        message={state.message ?? 'The query failed.'}
        onRetry={onRefresh}
      />
    );
  }

  const stale = isWidgetStale(state, now);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {state.status === 'empty' || !state.result ? (
        <p
          style={{
            ...muted,
            margin: 0,
            padding: '16px 0',
            textAlign: 'center',
          }}
        >
          No data for this range yet
        </p>
      ) : (
        <div
          aria-busy={state.refreshing || undefined}
          style={{ opacity: state.refreshing ? 0.6 : 1 }}
        >
          <ResultView result={state.result} />
        </div>
      )}
      {stale && state.fetchedAt && (
        <div>
          <StaleNotice
            lastUpdatedText={
              state.refreshError
                ? `Couldn't refresh · updated ${formatFetchedAgo(state.fetchedAt, now)}`
                : `Updated ${formatFetchedAgo(state.fetchedAt, now)}`
            }
            onRefresh={onRefresh}
          />
        </div>
      )}
    </div>
  );
}
