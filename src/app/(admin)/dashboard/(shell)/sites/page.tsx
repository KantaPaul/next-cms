import { AccessDenied } from '@/components/organisms/access-denied';
import { PageHeader } from '@/components/organisms/page-header';
import { PAGES } from '@/config/pages';
import { PERMISSIONS } from '@/config/permissions';
import { getCurrentUserAndTeamId } from '@/lib/auth';
import { metaObject } from '@/lib/utils/metadata';
import { requirePermission } from '@/server/services/require-permission';
import { siteContext } from '@/server/services/site-context';
import { sitesService } from '@/server/services/sites.service';
import { SitesManager } from './_components/sites-manager';

const TITLE = 'Sites';

export const metadata = {
  ...metaObject(TITLE),
};

export default async function SitesPage() {
  const { allowed } = await requirePermission(PERMISSIONS.SETTINGS_MANAGE);
  const breadcrumbs = [
    { title: 'Dashboard', href: PAGES.DASHBOARD.ROOT },
    { title: TITLE, href: PAGES.DASHBOARD.SITES },
  ];

  if (!allowed) {
    return (
      <>
        <PageHeader title={TITLE} breadcrumbs={breadcrumbs} />
        <AccessDenied what="sites" />
      </>
    );
  }

  const { userId } = await getCurrentUserAndTeamId();
  const [sites, current] = await Promise.all([
    sitesService.listForUser(userId),
    siteContext.adminSiteId(userId),
  ]);

  return (
    <>
      <PageHeader title={TITLE} breadcrumbs={breadcrumbs} />
      <SitesManager sites={sites} current={current} />
    </>
  );
}
