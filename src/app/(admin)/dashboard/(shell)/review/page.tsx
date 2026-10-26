import { AccessDenied } from '@/components/organisms/access-denied';
import { PageHeader } from '@/components/organisms/page-header';
import { PAGES } from '@/config/pages';
import { PERMISSIONS } from '@/config/permissions';
import { metaObject } from '@/lib/utils/metadata';
import { requirePermission } from '@/server/services/require-permission';
import { reviewService } from '@/server/services/review.service';
import { ReviewQueue } from './_components/review-queue';

const TITLE = 'Review';

export const metadata = { ...metaObject(TITLE) };

export default async function ReviewPage() {
  const { allowed } = await requirePermission(PERMISSIONS.PAGES_PUBLISH);
  const breadcrumbs = [
    { title: 'Dashboard', href: PAGES.DASHBOARD.ROOT },
    { title: TITLE, href: PAGES.DASHBOARD.REVIEW },
  ];

  if (!allowed) {
    return (
      <>
        <PageHeader title={TITLE} breadcrumbs={breadcrumbs} />
        <AccessDenied what="the review queue" />
      </>
    );
  }

  const queue = await reviewService.list();
  const rows = [...queue.pages, ...queue.posts].map(row => ({
    ...row,
    updatedAt: row.updatedAt?.toISOString() ?? null,
  }));

  return (
    <>
      <PageHeader title={TITLE} breadcrumbs={breadcrumbs} />
      <ReviewQueue rows={rows} />
    </>
  );
}
