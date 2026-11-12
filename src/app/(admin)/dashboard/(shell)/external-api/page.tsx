import { AccessDenied } from '@/components/organisms/access-denied';
import { PageHeader } from '@/components/organisms/page-header';
import { PAGES } from '@/config/pages';
import { PERMISSIONS } from '@/config/permissions';
import { metaObject } from '@/lib/utils/metadata';
import { externalApisService } from '@/server/services/external-apis.service';
import { requirePermission } from '@/server/services/require-permission';
import { ExternalApiManager } from './_components/external-api-manager';

const TITLE = 'External APIs';

export const metadata = { ...metaObject(TITLE) };

export default async function ExternalApiPage() {
  const { allowed } = await requirePermission(PERMISSIONS.PAGES_EDIT);
  const breadcrumbs = [
    { title: 'Dashboard', href: PAGES.DASHBOARD.ROOT },
    { title: TITLE, href: PAGES.DASHBOARD.EXTERNAL_API },
  ];

  if (!allowed) {
    return (
      <>
        <PageHeader title={TITLE} breadcrumbs={breadcrumbs} />
        <AccessDenied what="external APIs" />
      </>
    );
  }

  const rows = await externalApisService.list();

  return (
    <>
      <PageHeader title={TITLE} breadcrumbs={breadcrumbs} />
      <ExternalApiManager initialApis={rows} />
    </>
  );
}
