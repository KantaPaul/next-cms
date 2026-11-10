import Link from 'next/link';
import { AccessDenied } from '@/components/organisms/access-denied';
import { PageHeader } from '@/components/organisms/page-header';
import { PAGES } from '@/config/pages';
import { PERMISSIONS } from '@/config/permissions';
import { COMMENT_STATUSES, type CommentStatus } from '@/db/schemas/operations.schema';
import { cn } from '@/lib/utils/cn';
import { metaObject } from '@/lib/utils/metadata';
import { commentsService } from '@/server/services/comments.service';
import { requirePermission } from '@/server/services/require-permission';
import { siteSettingsService } from '@/server/services/site-settings.service';
import { CommentsTable } from './_components/comments-table';

const TITLE = 'Comments';

export const metadata = { ...metaObject(TITLE) };

const LABELS: Record<CommentStatus, string> = {
  pending: 'Pending',
  approved: 'Approved',
  spam: 'Spam',
  trash: 'Trash',
};

export default async function CommentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const { allowed } = await requirePermission(PERMISSIONS.COMMENTS_MODERATE);
  const breadcrumbs = [
    { title: 'Dashboard', href: PAGES.DASHBOARD.ROOT },
    { title: TITLE, href: PAGES.DASHBOARD.COMMENTS },
  ];
  if (!allowed) {
    return (
      <>
        <PageHeader title={TITLE} breadcrumbs={breadcrumbs} />
        <AccessDenied what="comments" />
      </>
    );
  }

  const params = await searchParams;
  const status: CommentStatus = (COMMENT_STATUSES as readonly string[]).includes(
    params.status ?? ''
  )
    ? (params.status as CommentStatus)
    : 'pending';
  const page = Math.max(Number(params.page) || 1, 1);
  const [list, counts, settings] = await Promise.all([
    commentsService.list(status, page),
    commentsService.counts(),
    siteSettingsService.get(),
  ]);
  const pages = Math.max(Math.ceil(list.total / list.pageSize), 1);

  return (
    <>
      <PageHeader title={TITLE} breadcrumbs={breadcrumbs} />
      {settings.readingSettings?.comments === false && (
        <p className="mb-4 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200">
          Comments are switched off site-wide (Settings → Single pages). Visitors can’t post new ones.
        </p>
      )}
      <nav aria-label="Comment status" className="mb-4 flex flex-wrap gap-2 text-sm">
        {COMMENT_STATUSES.map(s => (
          <Link
            key={s}
            href={`${PAGES.DASHBOARD.COMMENTS}?status=${s}`}
            aria-current={s === status ? 'page' : undefined}
            className={cn(
              'rounded-full border px-3 py-1',
              s === status
                ? 'border-primary bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {LABELS[s]} <span className="opacity-70">({counts[s]})</span>
          </Link>
        ))}
      </nav>
      <CommentsTable
        status={status}
        rows={list.rows.map(r => ({
          id: r.id,
          isReply: Boolean(r.parentId),
          authorName: r.authorName,
          authorEmail: r.authorEmail,
          authorUrl: r.authorUrl,
          isStaff: Boolean(r.userId),
          body: r.body,
          createdAt: r.createdAt.toISOString(),
          postTitle: r.targetTitle,
          postUrl: r.targetUrl,
          targetTypeLabel: r.targetTypeLabel,
        }))}
      />
      {pages > 1 && (
        <div className="mt-4 flex gap-3 text-sm">
          {page > 1 && (
            <Link href={`${PAGES.DASHBOARD.COMMENTS}?status=${status}&page=${page - 1}`}>
              ← Newer
            </Link>
          )}
          <span className="text-muted-foreground">
            Page {page} of {pages}
          </span>
          {page < pages && (
            <Link href={`${PAGES.DASHBOARD.COMMENTS}?status=${status}&page=${page + 1}`}>
              Older →
            </Link>
          )}
        </div>
      )}
    </>
  );
}
