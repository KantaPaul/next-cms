import Link from 'next/link';
import { PAGES } from '@/config/pages';
import {
  analyticsService,
  type TrendsList,
} from '@/server/services/analytics.service';
import { DualBars } from './_components/dual-bars';
import { TrendCard } from './_components/trend-card';

function changeLabel(current: number, previous: number): string | null {
  if (previous === 0 && current === 0) return null;
  if (previous === 0 && current > 0) return 'New';
  const pct = Math.round(((current - previous) / previous) * 100);
  return `${pct > 0 ? '+' : ''}${pct}%`;
}

function buildHref(opts: {
  range: 7 | 30;
  list: TrendsList;
  pageId?: string | null;
  postId?: string | null;
}) {
  const params = new URLSearchParams();
  params.set('range', String(opts.range));
  params.set('list', opts.list);
  if (opts.pageId) params.set('pageId', opts.pageId);
  else if (opts.postId) params.set('postId', opts.postId);
  return `${PAGES.DASHBOARD.ANALYTICS}?${params.toString()}`;
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{
    range?: string;
    list?: string;
    pageId?: string;
    postId?: string;
  }>;
}) {
  const params = await searchParams;
  const rangeDays = params.range === '7' ? 7 : 30;
  const list: TrendsList =
    params.list === 'paths' || params.list === 'referrers'
      ? params.list
      : 'pages';
  const pageId = params.pageId?.trim() || null;
  const postId = pageId ? null : params.postId?.trim() || null;

  const trends = await analyticsService.trends(rangeDays, {
    pageId,
    postId,
    list,
  });

  const hasTraffic = trends.views > 0 || trends.previousViews > 0;
  const viewsPerVisitor =
    trends.uniqueVisitors > 0
      ? Math.round((trends.views / trends.uniqueVisitors) * 10) / 10
      : 0;
  const prevViewsPerVisitor =
    trends.previousUniqueVisitors > 0
      ? Math.round(
          (trends.previousViews / trends.previousUniqueVisitors) * 10
        ) / 10
      : 0;

  return (
    <div className="flex w-full flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
          <p className="mt-1 text-sm text-steel-500 dark:text-steel-400">
            {trends.pageTitle
              ? `Trends for “${trends.pageTitle}” · vs previous ${rangeDays} days`
              : `Traffic trends · vs previous ${rangeDays} days`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={PAGES.DASHBOARD.ANALYTICS_BOARDS}
            className="rounded-md border border-steel-200 px-3 py-1.5 text-sm font-medium text-indigo-600 hover:bg-steel-50 dark:border-dark-300 dark:hover:bg-dark-200"
          >
            Dashboards
          </Link>
          {trends.pageId || trends.postId ? (
            <Link
              href={buildHref({ range: rangeDays, list })}
              className="rounded-md border border-steel-200 px-3 py-1.5 text-sm text-steel-600 hover:bg-steel-50 dark:border-dark-300 dark:hover:bg-dark-200"
            >
              Clear filter
            </Link>
          ) : null}
          <div className="flex gap-1 rounded-lg border border-steel-200 p-0.5 dark:border-dark-300">
            {([7, 30] as const).map(days => (
              <Link
                key={days}
                href={buildHref({
                  range: days,
                  list,
                  pageId: trends.pageId,
                  postId: trends.postId,
                })}
                className={`rounded-md px-3 py-1.5 text-sm ${
                  rangeDays === days
                    ? 'bg-steel-100 font-medium dark:bg-dark-200'
                    : 'text-steel-500 hover:text-steel-800 dark:hover:text-steel-200'
                }`}
              >
                {days}d
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Headline cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <TrendCard
          label="Views"
          value={trends.views}
          change={changeLabel(trends.views, trends.previousViews)}
          previous={trends.previousViews}
        />
        <TrendCard
          label="Unique visitors"
          value={trends.uniqueVisitors}
          change={changeLabel(
            trends.uniqueVisitors,
            trends.previousUniqueVisitors
          )}
          previous={trends.previousUniqueVisitors}
        />
        <TrendCard
          label="Views per visitor"
          value={viewsPerVisitor}
          change={changeLabel(viewsPerVisitor, prevViewsPerVisitor)}
          previous={prevViewsPerVisitor}
        />
      </div>

      {!hasTraffic ? (
        <div className="rounded-lg border border-dashed border-steel-200 px-6 py-10 text-center text-sm text-steel-500 dark:border-dark-300">
          No views recorded yet. Publish a public page or post and visit it —
          the beacon will start counting here.
        </div>
      ) : (
        <>
          {/* Dual-bar chart */}
          <div className="rounded-lg border border-steel-200 p-4 dark:border-dark-300">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="text-xs uppercase tracking-wide text-steel-400">
                Daily views
              </div>
              <div className="flex items-center gap-3 text-xs text-steel-500">
                <span className="inline-flex items-center gap-1.5">
                  <span className="inline-block h-2.5 w-2.5 rounded-sm bg-indigo-500/80" />
                  This period
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="inline-block h-2.5 w-2.5 rounded-sm bg-steel-300 dark:bg-steel-600" />
                  Previous
                </span>
              </div>
            </div>
            <DualBars daily={trends.daily} rangeDays={rangeDays} />
          </div>

          {/* List switcher + breakdown */}
          <section>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-medium uppercase tracking-wide text-steel-400">
                Breakdown
              </h2>
              <div className="flex gap-1 rounded-lg border border-steel-200 p-0.5 dark:border-dark-300">
                {(
                  [
                    ['pages', 'Pages'],
                    ['paths', 'Paths'],
                    ['referrers', 'Referrers'],
                  ] as const
                ).map(([id, label]) => (
                  <Link
                    key={id}
                    href={buildHref({
                      range: rangeDays,
                      list: id,
                      pageId: trends.pageId,
                      postId: trends.postId,
                    })}
                    className={`rounded-md px-3 py-1.5 text-sm ${
                      list === id
                        ? 'bg-steel-100 font-medium dark:bg-dark-200'
                        : 'text-steel-500 hover:text-steel-800 dark:hover:text-steel-200'
                    }`}
                  >
                    {label}
                  </Link>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-steel-200 dark:border-dark-300">
              {trends.rows.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-steel-500">
                  No data for this list in the selected window.
                </p>
              ) : (
                <ul className="divide-y divide-steel-100 dark:divide-dark-300">
                  {list === 'pages' &&
                    trends.rows.map(row => {
                      const ch = changeLabel(row.views, row.previousViews);
                      return (
                        <li
                          key={`${row.pageId ?? ''}-${row.postId ?? ''}-${row.path}`}
                          className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm"
                        >
                          <div className="min-w-0 flex-1">
                            <Link
                              href={buildHref({
                                range: rangeDays,
                                list,
                                pageId: row.pageId,
                                postId: row.postId,
                              })}
                              className="font-medium hover:underline"
                            >
                              {row.title}
                            </Link>
                            <div className="truncate text-xs text-steel-500">
                              {row.path}
                              {row.pageId && (
                                <>
                                  {' · '}
                                  <Link
                                    href={PAGES.DASHBOARD.PAGES.EDIT(
                                      row.pageId
                                    )}
                                    className="hover:underline"
                                  >
                                    Edit
                                  </Link>
                                </>
                              )}
                              {row.postId && (
                                <>
                                  {' · '}
                                  <Link
                                    href={PAGES.DASHBOARD.POSTS.EDIT(
                                      row.postId
                                    )}
                                    className="hover:underline"
                                  >
                                    Edit
                                  </Link>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="flex shrink-0 items-baseline gap-3">
                            <span className="font-medium">{row.views}</span>
                            <span className="text-xs text-steel-400">
                              prev {row.previousViews}
                            </span>
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

                  {list === 'paths' &&
                    trends.rows.map(row => {
                      const ch = changeLabel(row.views, row.previousViews);
                      return (
                        <li
                          key={row.path}
                          className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm"
                        >
                          <span className="min-w-0 flex-1 truncate font-mono text-xs">
                            {row.path}
                          </span>
                          <div className="flex shrink-0 items-baseline gap-3">
                            <span className="font-medium">{row.views}</span>
                            <span className="text-xs text-steel-400">
                              prev {row.previousViews}
                            </span>
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

                  {list === 'referrers' &&
                    trends.rows.map(row => {
                      const ch = changeLabel(row.views, row.previousViews);
                      return (
                        <li
                          key={row.host}
                          className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm"
                        >
                          <span className="min-w-0 flex-1 truncate">
                            {row.host}
                          </span>
                          <div className="flex shrink-0 items-baseline gap-3">
                            <span className="font-medium">{row.views}</span>
                            <span className="text-xs text-steel-400">
                              prev {row.previousViews}
                            </span>
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
          </section>
        </>
      )}
    </div>
  );
}
