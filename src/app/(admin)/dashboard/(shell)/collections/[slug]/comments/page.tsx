import Link from 'next/link';
import {
  CommentsModerationView,
  parseCommentStatusParam,
} from '@/app/(admin)/dashboard/(shell)/comments/_components/comments-moderation-view';
import { AccessDenied } from '@/components/organisms/access-denied';
import { PageHeader } from '@/components/organisms/page-header';
import { PAGES } from '@/config/pages';
import { PERMISSIONS } from '@/config/permissions';
import { normalizePostTypeSupports } from '@/config/post-types';
import { metaObject } from '@/lib/utils/metadata';
import { commentsService } from '@/server/services/comments.service';
import { requirePermission } from '@/server/services/require-permission';
import { siteSettingsService } from '@/server/services/site-settings.service';
import { loadPostTypeRoute } from '../../_modules/post-type-route';

export const metadata = metaObject('Comments');

export default async function CollectionCommentsPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const { slug } = await params;
  const collection = await loadPostTypeRoute(
    slug,
    PAGES.DASHBOARD.COLLECTION_COMMENTS
  );
  const { allowed } = await requirePermission(PERMISSIONS.COMMENTS_MODERATE);

  const breadcrumbs = [
    { title: 'Dashboard', href: PAGES.DASHBOARD.ROOT },
    { title: 'Post types', href: PAGES.DASHBOARD.COLLECTIONS },
    {
      title: collection.name,
      href: PAGES.DASHBOARD.COLLECTION(collection.slug),
    },
    {
      title: 'Comments',
      href: PAGES.DASHBOARD.COLLECTION_COMMENTS(collection.slug),
    },
  ];

  if (!allowed) {
    return (
      <>
        <PageHeader
          title={`Comments · ${collection.name}`}
          breadcrumbs={breadcrumbs}
        />
        <AccessDenied what="comments" />
      </>
    );
  }

  const query = await searchParams;
  const status = parseCommentStatusParam(query.status);
  const page = Math.max(Number(query.page) || 1, 1);
  const [list, counts, settings] = await Promise.all([
    commentsService.list(status, page, 30, collection.id),
    commentsService.counts(collection.id),
    siteSettingsService.get(),
  ]);
  const supports = normalizePostTypeSupports(collection.supports);

  return (
    <>
      <PageHeader
        title={`Comments · ${collection.name}`}
        breadcrumbs={breadcrumbs}
      />
      <CommentsModerationView
        baseHref={PAGES.DASHBOARD.COLLECTION_COMMENTS(collection.slug)}
        status={status}
        page={page}
        total={list.total}
        pageSize={list.pageSize}
        counts={counts}
        siteCommentsOff={settings.readingSettings?.comments === false}
        extraWarning={
          !supports.comments ? (
            <p className="mb-4 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200">
              Comments are switched off for {collection.name.toLowerCase()} (
              <Link
                href={PAGES.DASHBOARD.COLLECTION_SETTINGS(collection.slug)}
                className="underline underline-offset-2"
              >
                Fields &amp; settings
              </Link>
              ). Visitors can’t post new ones.
            </p>
          ) : undefined
        }
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
    </>
  );
}
