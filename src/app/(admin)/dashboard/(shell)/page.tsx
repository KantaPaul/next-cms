import Link from 'next/link';
import { pagesServices } from '@/app/(admin)/dashboard/(shell)/pages/_modules/pages.service';
import { PAGES } from '@/config/pages';
import { analyticsService } from '@/server/services/analytics.service';
import { auditService } from '@/server/services/audit.service';

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function DailyBars({
  daily,
  rangeDays,
}: {
  daily: { day: string; views: number }[];
  rangeDays: number;
}) {
  const max = Math.max(1, ...daily.map(d => d.views));
  const byDay = new Map(daily.map(d => [d.day, d.views]));
  const days: { day: string; views: number }[] = [];
  const start = new Date();
  start.setUTCDate(start.getUTCDate() - rangeDays + 1);
  start.setUTCHours(0, 0, 0, 0);
  for (let i = 0; i < rangeDays; i++) {
    const d = new Date(start);
    d.setUTCDate(start.getUTCDate() + i);
    const key = d.toISOString().slice(0, 10);
    days.push({ day: key, views: byDay.get(key) ?? 0 });
  }

  const barWidth = Math.max(4, Math.floor(280 / rangeDays) - 2);
  const height = 80;

  return (
    <svg
      viewBox={`0 0 ${rangeDays * (barWidth + 2)} ${height + 16}`}
      className="h-24 w-full"
      role="img"
      aria-label="Daily page views"
    >
      {days.map((d, i) => {
        const h = Math.round((d.views / max) * height);
        return (
          <g key={d.day}>
            <rect
              x={i * (barWidth + 2)}
              y={height - h}
              width={barWidth}
              height={h}
              rx={2}
              className="fill-indigo-500/80 dark:fill-indigo-400/80"
            >
              <title>
                {d.day}: {d.views} view{d.views === 1 ? '' : 's'}
              </title>
            </rect>
          </g>
        );
      })}
    </svg>
  );
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const params = await searchParams;
  const rangeDays = params.range === '7' ? 7 : 30;

  const [traffic, content, statusCounts, audits] = await Promise.all([
    analyticsService.summary(rangeDays),
    analyticsService.contentOverview(),
    pagesServices.getStatusCounts(),
    auditService.list(8),
  ]);

  const hasTraffic = traffic.views > 0;

  return (
    <div className="flex w-full flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-steel-500 dark:text-steel-400">
            Traffic and content overview
          </p>
        </div>
        <div className="flex gap-1 rounded-lg border border-steel-200 p-0.5 dark:border-dark-300">
          {([7, 30] as const).map(days => (
            <Link
              key={days}
              href={`/dashboard?range=${days}`}
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

      {/* Traffic summary */}
      <section>
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-steel-400">
          Traffic ({rangeDays} days)
        </h2>
        <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="rounded-lg border border-steel-200 px-4 py-3 dark:border-dark-300">
            <div className="text-xs uppercase tracking-wide text-steel-400">
              Views
            </div>
            <div className="text-2xl font-semibold">{traffic.views}</div>
          </div>
          <div className="rounded-lg border border-steel-200 px-4 py-3 dark:border-dark-300">
            <div className="text-xs uppercase tracking-wide text-steel-400">
              Unique visitors
            </div>
            <div className="text-2xl font-semibold">
              {traffic.uniqueVisitors}
            </div>
          </div>
        </div>

        {!hasTraffic ? (
          <div className="rounded-lg border border-dashed border-steel-200 px-6 py-10 text-center text-sm text-steel-500 dark:border-dark-300">
            No page views recorded yet. Publish a public page and visit it — the
            beacon will start counting here.
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="rounded-lg border border-steel-200 p-4 dark:border-dark-300 lg:col-span-2">
              <div className="mb-2 text-xs uppercase tracking-wide text-steel-400">
                Daily views
              </div>
              <DailyBars daily={traffic.daily} rangeDays={rangeDays} />
            </div>
            <div className="space-y-4">
              <div className="rounded-lg border border-steel-200 p-4 dark:border-dark-300">
                <div className="mb-2 text-xs uppercase tracking-wide text-steel-400">
                  Top pages
                </div>
                <ul className="space-y-1.5 text-sm">
                  {traffic.topPages.map(p => (
                    <li
                      key={p.pageId + p.path}
                      className="flex justify-between gap-2"
                    >
                      <span className="truncate" title={p.title}>
                        {p.title}
                      </span>
                      <span className="shrink-0 text-steel-500">{p.views}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-lg border border-steel-200 p-4 dark:border-dark-300">
                <div className="mb-2 text-xs uppercase tracking-wide text-steel-400">
                  Top referrers
                </div>
                {traffic.topReferrers.length === 0 ? (
                  <p className="text-sm text-steel-500">No referrers yet</p>
                ) : (
                  <ul className="space-y-1.5 text-sm">
                    {traffic.topReferrers.map(r => (
                      <li
                        key={r.host}
                        className="flex justify-between gap-2"
                      >
                        <span className="truncate">{r.host}</span>
                        <span className="shrink-0 text-steel-500">{r.views}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Content overview */}
      <section>
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-steel-400">
          Content
        </h2>
        <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-5">
          {(['published', 'draft', 'review', 'scheduled', 'archived'] as const).map(
            status => (
              <div
                key={status}
                className="rounded-lg border border-steel-200 px-4 py-3 dark:border-dark-300"
              >
                <div className="text-xs uppercase tracking-wide text-steel-400">
                  {status}
                </div>
                <div className="text-2xl font-semibold">
                  {statusCounts[status] ?? 0}
                </div>
              </div>
            )
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-steel-200 px-4 py-3 dark:border-dark-300">
            <div className="text-xs uppercase tracking-wide text-steel-400">
              Media files
            </div>
            <div className="text-2xl font-semibold">{content.mediaFiles}</div>
            <div className="text-xs text-steel-500">
              {formatBytes(content.mediaBytes)}
            </div>
          </div>
          <div className="rounded-lg border border-steel-200 px-4 py-3 dark:border-dark-300">
            <div className="text-xs uppercase tracking-wide text-steel-400">
              Users
            </div>
            <div className="text-2xl font-semibold">{content.activeUsers}</div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border border-steel-200 p-4 dark:border-dark-300">
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-steel-400">
            Recently updated pages
          </h2>
          {content.recentPages.length === 0 ? (
            <p className="text-sm text-steel-500">No pages yet</p>
          ) : (
            <ul className="divide-y divide-steel-100 dark:divide-dark-300">
              {content.recentPages.map(p => (
                <li key={p.id} className="flex items-center justify-between py-2">
                  <Link
                    href={PAGES.DASHBOARD.PAGES.EDIT(p.id)}
                    className="truncate font-medium hover:underline"
                  >
                    {p.title}
                  </Link>
                  <span className="ml-2 shrink-0 text-xs capitalize text-steel-500">
                    {p.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-lg border border-steel-200 p-4 dark:border-dark-300">
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-steel-400">
            Recent activity
          </h2>
          {audits.length === 0 ? (
            <p className="text-sm text-steel-500">No audit events yet</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {audits.map(a => (
                <li key={a.id} className="flex flex-col gap-0.5">
                  <span>
                    <span className="font-medium">
                      {a.actor?.name || a.actor?.email || 'System'}
                    </span>{' '}
                    <span className="text-steel-500">{a.action}</span>{' '}
                    <span className="text-steel-500">{a.targetType}</span>
                    {a.targetName && (
                      <>
                        :{' '}
                        <span className="font-medium">{a.targetName}</span>
                      </>
                    )}
                  </span>
                  <span className="text-xs text-steel-400">
                    {a.createdAt
                      ? new Date(a.createdAt).toLocaleString()
                      : ''}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
