import { AccessDenied } from '@/components/organisms/access-denied';
import { PageHeader } from '@/components/organisms/page-header';
import { PAGES } from '@/config/pages';
import { PERMISSIONS } from '@/config/permissions';
import { metaObject } from '@/lib/utils/metadata';
import { requirePermission } from '@/server/services/require-permission';
import { redirectsService } from '@/server/services/redirects.service';
import { RedirectsManager } from './_components/redirects-manager';

const TITLE = 'Redirects';

export const metadata = { ...metaObject(TITLE) };

export default async function RedirectsPage() {
  const { allowed } = await requirePermission(PERMISSIONS.SETTINGS_MANAGE);
  const breadcrumbs = [
    { title: 'Dashboard', href: PAGES.DASHBOARD.ROOT },
    { title: TITLE, href: PAGES.DASHBOARD.REDIRECTS },
  ];

  if (!allowed) {
    return (
      <>
        <PageHeader title={TITLE} breadcrumbs={breadcrumbs} />
        <AccessDenied what="redirects" />
      </>
    );
  }

  const rows = await redirectsService.list();

  return (
    <>
      <PageHeader title={TITLE} breadcrumbs={breadcrumbs} />
      <RedirectsManager
        rows={rows.map(row => ({
          id: row.id,
          fromPath: row.fromPath,
          toPath: row.toPath,
          statusCode: row.statusCode,
        }))}
      />
    </>
  );
}
