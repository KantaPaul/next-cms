import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PAGES } from '@/config/pages';
import { defaultWidgetTitle } from '@/db/schemas/analytics.schema';
import { analyticsBoardsService } from '@/server/services/analytics-boards.service';
import { analyticsService } from '@/server/services/analytics.service';
import { DualBars } from '../../_components/dual-bars';
import { TrendCard } from '../../_components/trend-card';
import { DeleteBoardButton } from '../_components/delete-board-button';

function changeLabel(current: number, previous: number | null): string | null {
  if (previous == null) return null;
  if (previous === 0 && current === 0) return null;
  if (previous === 0 && current > 0) return 'New';
  const pct = Math.round(((current - previous) / previous) * 100);
  return `${pct > 0 ? '+' : ''}${pct}%`;
}

export default async function BoardViewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ range?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const board = await analyticsBoardsService.get(id);
  if (!board) notFound();

  const overrideRange = sp.range === '7' ? 7 : sp.range === '30' ? 30 : null;
  const boardRange = overrideRange ?? board.layout.range;

  const widgetResults = await Promise.all(
    board.layout.widgets.map(async w => {
      const result = await analyticsService.widget(w.query, boardRange);
      return { widget: w, result };
    })
  );

  const rangeHref = (days: 7 | 30) =>
    `${PAGES.DASHBOARD.ANALYTICS_BOARD(id)}?range=${days}`;

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{board.name}</h1>
          <p className="mt-1 text-sm text-steel-500 dark:text-steel-400">
            {board.layout.widgets.length} widget
            {board.layout.widgets.length === 1 ? '' : 's'} · vs previous{' '}
            {boardRange} days
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-1 rounded-lg border border-steel-200 p-0.5 dark:border-dark-300">
            {([7, 30] as const).map(days => (
              <Link
                key={days}
                href={rangeHref(days)}
                className={`rounded-md px-3 py-1.5 text-sm ${
                  boardRange === days
                    ? 'bg-steel-100 font-medium dark:bg-dark-200'
                    : 'text-steel-500 hover:text-steel-800 dark:hover:text-steel-200'
                }`}
              >
                {days}d
              </Link>
            ))}
          </div>
          <Link
            href={PAGES.DASHBOARD.ANALYTICS_BOARD_EDIT(id)}
            className="rounded-md border border-steel-200 px-3 py-1.5 text-sm hover:bg-steel-50 dark:border-dark-300 dark:hover:bg-dark-200"
          >
            Edit
          </Link>
          <DeleteBoardButton id={id} name={board.name} redirectToList />
          <Link
            href={PAGES.DASHBOARD.ANALYTICS_BOARDS}
            className="rounded-md border border-steel-200 px-3 py-1.5 text-sm text-steel-600 hover:bg-steel-50 dark:border-dark-300 dark:hover:bg-dark-200"
          >
            All boards
          </Link>
        </div>
      </div>

      {board.layout.widgets.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-steel-200 px-6 py-16 text-center dark:border-dark-300">
          <p className="text-sm text-steel-500">This board has no widgets yet.</p>
          <Link
            href={PAGES.DASHBOARD.ANALYTICS_BOARD_EDIT(id)}
            className="text-sm font-medium text-indigo-600 hover:underline"
          >
            Open the editor
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-12 gap-3">
          {widgetResults.map(({ widget, result }) => {
            const spanClass =
              widget.span === 4
                ? 'col-span-12 md:col-span-4'
                : widget.span === 6
                  ? 'col-span-12 md:col-span-6'
                  : 'col-span-12';
            const title = defaultWidgetTitle(widget);

            if (result.kind === 'stat') {
              return (
                <div key={widget.id} className={spanClass}>
                  <TrendCard
                    label={title}
                    value={result.value}
                    change={changeLabel(result.value, result.previous)}
                    previous={result.previous ?? 0}
                    hidePrevious={result.previous == null}
                  />
                </div>
              );
            }

            if (result.kind === 'series') {
              const daily = result.points.map(p => ({
                day: p.label,
                views: p.value,
                previousViews: p.previous ?? 0,
              }));
              return (
                <div
                  key={widget.id}
                  className={`${spanClass} rounded-lg border border-steel-200 p-4 dark:border-dark-300`}
                >
                  <div className="mb-3 text-xs uppercase tracking-wide text-steel-400">
                    {title}
                  </div>
                  <DualBars
                    daily={daily}
                    rangeDays={result.points.length}
                    showPrevious={result.points.some(p => p.previous != null)}
                  />
                </div>
              );
            }

            // rows
            return (
              <div
                key={widget.id}
                className={`${spanClass} rounded-lg border border-steel-200 dark:border-dark-300`}
              >
                <div className="border-b border-steel-100 px-4 py-2 text-xs uppercase tracking-wide text-steel-400 dark:border-dark-300">
                  {title}
                </div>
                {result.rows.length === 0 ? (
                  <p className="px-4 py-6 text-center text-sm text-steel-500">
                    No data in this window.
                  </p>
                ) : (
                  <ul className="divide-y divide-steel-100 dark:divide-dark-300">
                    {result.rows.map(row => {
                      const ch = changeLabel(row.value, row.previous);
                      return (
                        <li
                          key={row.key}
                          className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-sm"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="truncate font-medium">{row.label}</div>
                            {row.detail && (
                              <div className="truncate text-xs text-steel-500">
                                {row.detail}
                              </div>
                            )}
                          </div>
                          <div className="flex shrink-0 items-baseline gap-3">
                            <span className="font-medium">{row.value}</span>
                            {row.previous != null && (
                              <span className="text-xs text-steel-400">
                                prev {row.previous}
                              </span>
                            )}
                            {ch && (
                              <span
                                className={`text-xs font-medium ${
                                  ch === 'New' || ch.startsWith('+')
                                    ? 'text-emerald-600 dark:text-emerald-400'
                                    : ch.startsWith('-')
                                      ? 'text-rose-600 dark:text-rose-400'
                                      : 'text-steel-500'
                                }`}
                              >
                                {ch}
                              </span>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
