import { AccessDenied } from '@/components/organisms/access-denied';
import { PageHeader } from '@/components/organisms/page-header';
import { PAGES } from '@/config/pages';
import { PERMISSIONS } from '@/config/permissions';
import { metaObject } from '@/lib/utils/metadata';
import { privacyService } from '@/server/services/privacy.service';
import { requirePermission } from '@/server/services/require-permission';
import { adminSiteId } from '@/server/services/site-context';
import { PrivacyManager } from './_components/privacy-manager';

const TITLE = 'Privacy & GDPR';

export const metadata = { ...metaObject(TITLE) };

export default async function PrivacyToolPage() {
  const { allowed } = await requirePermission(PERMISSIONS.SETTINGS_MANAGE);
  const breadcrumbs = [
    { title: 'Dashboard', href: PAGES.DASHBOARD.ROOT },
    { title: 'Tools', href: PAGES.DASHBOARD.TOOLS_IMPORT },
    { title: 'Privacy', href: PAGES.DASHBOARD.TOOLS_PRIVACY },
  ];

  if (!allowed) {
    return (
      <>
        <PageHeader title={TITLE} breadcrumbs={breadcrumbs} />
        <AccessDenied what="privacy tools" />
      </>
    );
  }

  const siteId = await adminSiteId();
  const requests = await privacyService.listRequests(siteId);

  return (
    <>
      <PageHeader title={TITLE} breadcrumbs={breadcrumbs} />
      <PrivacyManager
        initialRequests={requests.map(r => ({
          id: r.id,
          email: r.email,
          type: r.type,
          status: r.status,
          visitorId: r.visitorId ?? null,
          confirmedAt: r.confirmedAt ? r.confirmedAt.toISOString() : null,
          completedAt: r.completedAt ? r.completedAt.toISOString() : null,
          createdAt: r.createdAt.toISOString(),
          notes: r.notes ?? null,
        }))}
      />
    </>
  );
}
