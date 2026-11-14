import Link from '@/components/atoms/next/link';
import type { ReactNode } from 'react';
import {
  COMMENT_STATUSES,
  type CommentStatus,
} from '@/db/schemas/operations.schema';
import { cn } from '@/lib/utils/cn';
import { type CommentRow, CommentsTable } from './comments-table';

const LABELS: Record<CommentStatus, string> = {
  pending: 'Pending',
  approved: 'Approved',
  spam: 'Spam',
  trash: 'Trash',
};

export function parseCommentStatusParam(raw?: string): CommentStatus {
  return (COMMENT_STATUSES as readonly string[]).includes(raw ?? '')
    ? (raw as CommentStatus)
    : 'pending';
}

export function CommentsModerationView({
  baseHref,
  status,
  page,
  total,
  pageSize,
  rows,
  counts,
  siteCommentsOff,
  extraWarning,
}: {
  baseHref: string;
  status: CommentStatus;
  page: number;
  total: number;
  pageSize: number;
  rows: CommentRow[];
  counts: Record<CommentStatus, number>;
  siteCommentsOff?: boolean;
  extraWarning?: ReactNode;
}) {
  const pages = Math.max(Math.ceil(total / pageSize), 1);

  return (
    <>
      {siteCommentsOff && (
        <p className="mb-4 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200">
          Comments are switched off site-wide (Settings → Single pages). Visitors
          can’t post new ones.
        </p>
      )}
      {extraWarning}
      <nav aria-label="Comment status" className="mb-4 flex flex-wrap gap-2 text-sm">
        {COMMENT_STATUSES.map(s => (
          <Link
            key={s}
            href={`${baseHref}?status=${s}`}
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
      <CommentsTable status={status} rows={rows} />
      {pages > 1 && (
        <div className="mt-4 flex gap-3 text-sm">
          {page > 1 && (
            <Link href={`${baseHref}?status=${status}&page=${page - 1}`}>
              ← Newer
            </Link>
          )}
          <span className="text-muted-foreground">
            Page {page} of {pages}
          </span>
          {page < pages && (
            <Link href={`${baseHref}?status=${status}&page=${page + 1}`}>
              Older →
            </Link>
          )}
        </div>
      )}
    </>
  );
}
