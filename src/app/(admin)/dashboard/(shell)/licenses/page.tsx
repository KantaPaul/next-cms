import { Settings } from 'lucide-react';
import Link from 'next/link';
import { AccessDenied } from '@/components/organisms/access-denied';
import { PageHeader } from '@/components/organisms/page-header';
import { PAGES } from '@/config/pages';
import { PERMISSIONS } from '@/config/permissions';
import type { LicenseStatus } from '@/db/schemas/licenses.schema';
import { metaObject } from '@/lib/utils/metadata';
import { licenseService } from '@/server/services/license.service';
import { requirePermission } from '@/server/services/require-permission';
import {
  type LicenseListItem,
  LicensesList,
} from './_components/licenses-list';

const TITLE = 'Licenses';

export const metadata = {
  ...metaObject(TITLE),
};

interface LicensesPageProps {
  searchParams: Promise<{
    q?: string;
    status?: string;
    page?: string;
  }>;
}

export default async function LicensesPage({
  searchParams,
}: LicensesPageProps) {
  const { allowed } = await requirePermission(PERMISSIONS.LICENSES_MANAGE);
  const breadcrumbs = [
    { title: 'Dashboard', href: PAGES.DASHBOARD.ROOT },
    { title: TITLE, href: PAGES.DASHBOARD.LICENSES },
  ];

  if (!allowed) {
    return (
      <>
        <PageHeader title={TITLE} breadcrumbs={breadcrumbs} />
        <AccessDenied what="license management" />
      </>
    );
  }

  const resolvedParams = await searchParams;
  const page = parseInt(resolvedParams.page || '1', 10);
  const search = resolvedParams.q || '';
  const status = resolvedParams.status as LicenseStatus | undefined;

  const result = await licenseService.listLicenses({
    search: search.trim() || undefined,
    status: status || undefined,
    page: isNaN(page) ? 1 : page,
    limit: 20,
  });

  return (
    <>
      <PageHeader title={TITLE} breadcrumbs={breadcrumbs}>
        <div className="w-full text-right">
          <Link
            href={PAGES.DASHBOARD.SETTINGS_LICENSE}
            className="inline-flex items-center gap-2 rounded-md bg-secondary px-4 py-2 text-sm font-medium hover:bg-secondary/80 border text-foreground"
          >
            <Settings className="h-4 w-4" />
            License Settings
          </Link>
        </div>
      </PageHeader>
      <LicensesList
        items={result.items as unknown as LicenseListItem[]}
        total={result.total}
        page={result.page}
        limit={result.limit}
        totalPages={result.totalPages}
        currentSearch={search}
        currentStatus={status || ''}
      />
    </>
  );
}
