import { AccessDenied } from '@/components/organisms/access-denied';
import { PageHeader } from '@/components/organisms/page-header';
import { PAGES } from '@/config/pages';
import { PERMISSIONS } from '@/config/permissions';
import { metaObject } from '@/lib/utils/metadata';
import { importJobService } from '@/server/import/job.service';
import { requirePermission } from '@/server/services/require-permission';
import { ImportWizard } from './_components/import-wizard';

const TITLE = 'Import from WordPress & Elementor';

export const metadata = { ...metaObject(TITLE) };

export default async function ImportPage() {
  const { access, allowed } = await requirePermission(
    PERMISSIONS.SETTINGS_MANAGE
  );
  const breadcrumbs = [
    { title: 'Dashboard', href: PAGES.DASHBOARD.ROOT },
    { title: 'Tools', href: PAGES.DASHBOARD.TOOLS_IMPORT },
    { title: 'Import', href: PAGES.DASHBOARD.TOOLS_IMPORT },
  ];

  if (!allowed) {
    return (
      <>
        <PageHeader title={TITLE} breadcrumbs={breadcrumbs} />
        <AccessDenied what="site import" />
      </>
    );
  }

  const jobs = await importJobService.listJobs(access);

  return (
    <>
      <PageHeader title={TITLE} breadcrumbs={breadcrumbs} />
      <ImportWizard
        initialJobs={jobs.map(j => ({
          ...j,
          createdAt: j.createdAt.toISOString(),
          updatedAt: j.updatedAt ? j.updatedAt.toISOString() : null,
        }))}
      />
    </>
  );
}
