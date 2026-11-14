import { notFound } from 'next/navigation';
import { AccessDenied } from '@/components/organisms/access-denied';
import { PageHeader } from '@/components/organisms/page-header';
import { PAGES } from '@/config/pages';
import { PERMISSIONS } from '@/config/permissions';
import { metaObject } from '@/lib/utils/metadata';
import { requirePermission } from '@/server/services/require-permission';
import { licenseService } from '@/server/services/license.service';
import { LicenseDetailView } from './_components/license-detail';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return metaObject(`License ${id}`);
}

interface LicenseDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function LicenseDetailPage({ params }: LicenseDetailPageProps) {
  const { id } = await params;
  const { allowed } = await requirePermission(PERMISSIONS.LICENSES_MANAGE);
  const breadcrumbs = [
    { title: 'Dashboard', href: PAGES.DASHBOARD.ROOT },
    { title: 'Licenses', href: PAGES.DASHBOARD.LICENSES },
    { title: id, href: `/dashboard/licenses/${id}` },
  ];

  if (!allowed) {
    return (
      <>
        <PageHeader title={`License ${id}`} breadcrumbs={breadcrumbs} />
        <AccessDenied />
      </>
    );
  }

  const detail = await licenseService.getLicenseDetail(id);
  if (!detail) {
    notFound();
  }

  return (
    <>
      <PageHeader title={`License: ${detail.license.publicId}`} breadcrumbs={breadcrumbs} />
      <LicenseDetailView
        license={detail.license}
        activeInstallation={detail.activeInstallation}
        events={detail.events}
      />
    </>
  );
}
