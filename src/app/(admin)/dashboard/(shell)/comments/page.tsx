import { AccessDenied } from '@/components/organisms/access-denied';
import { PageHeader } from '@/components/organisms/page-header';
import { PAGES } from '@/config/pages';
import { PERMISSIONS } from '@/config/permissions';
import { metaObject } from '@/lib/utils/metadata';
import { commentsService } from '@/server/services/comments.service';
import { requirePermission } from '@/server/services/require-permission';
import { siteSettingsService } from '@/server/services/site-settings.service';
import {
  CommentsModerationView,
  parseCommentStatusParam,
} from './_components/comments-moderation-view';

const TITLE = 'Comments';

export const metadata = { ...metaObject(TITLE) };

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
  const status = parseCommentStatusParam(params.status);
  const page = Math.max(Number(params.page) || 1, 1);
  const [list, counts, settings] = await Promise.all([
    commentsService.list(status, page),
    commentsService.counts(),
    siteSettingsService.get(),
  ]);

  return (
    <>
      <PageHeader title={TITLE} breadcrumbs={breadcrumbs} />
      <CommentsModerationView
        baseHref={PAGES.DASHBOARD.COMMENTS}
        status={status}
        page={page}
        total={list.total}
        pageSize={list.pageSize}
        counts={counts}
        siteCommentsOff={settings.readingSettings?.comments === false}
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
