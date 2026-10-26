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

export default async function DashboardPage() {
  const [traffic, content, statusCounts, audits] = await Promise.all([
    analyticsService.summary(30),
    analyticsService.contentOverview(),
    pagesServices.getStatusCounts(),
    auditService.list(8),
  ]);

  return (
    <div className="flex w-full flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-steel-500 dark:text-steel-400">
          Traffic and content overview
        </p>
      </div>

      {/* Traffic summary — fixed 30 days + link to full analytics */}
      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-medium uppercase tracking-wide text-steel-400">
            Traffic (30 days)
          </h2>
          <Link
            href={PAGES.DASHBOARD.ANALYTICS}
            className="text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400"
          >
            View analytics →
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
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
        {traffic.views === 0 && (
          <div className="mt-4 rounded-lg border border-dashed border-steel-200 px-6 py-8 text-center text-sm text-steel-500 dark:border-dark-300">
            No views recorded yet. Publish a public page or post and visit it — the
            beacon will start counting here.
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
