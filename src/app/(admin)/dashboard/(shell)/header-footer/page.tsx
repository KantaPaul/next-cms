import { AccessDenied } from '@/components/organisms/access-denied';
import { PageHeader } from '@/components/organisms/page-header';
import { PAGES } from '@/config/pages';
import { PERMISSIONS } from '@/config/permissions';
import { metaObject } from '@/lib/utils/metadata';
import { requirePermission } from '@/server/services/require-permission';
import type { SiteTemplateCategory } from '@/db/seed/header-footer-starters';
import { HeaderFooterList } from './_components/header-footer-list';
import { headerFooterService } from './_modules/header-footer.service';

const TITLE = 'Site templates';

export const metadata = {
  ...metaObject(TITLE),
};

const TYPE_TO_CATEGORY: Record<string, SiteTemplateCategory> = {
  header: 'Header',
  footer: 'Footer',
  search: 'Search',
  archive: 'Archive',
};

export default async function HeaderFooterPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string | string[] }>;
}) {
  const { type } = await searchParams;
  const initialTab =
    TYPE_TO_CATEGORY[(Array.isArray(type) ? type[0] : type)?.toLowerCase() ?? ''] ??
    'Header';
  const { access, allowed } = await requirePermission(PERMISSIONS.PAGES_EDIT);
  const breadcrumbs = [
    { title: 'Dashboard', href: PAGES.DASHBOARD.ROOT },
    { title: TITLE, href: PAGES.DASHBOARD.HEADER_FOOTER },
  ];

  if (!allowed) {
    return (
      <>
        <PageHeader title={TITLE} breadcrumbs={breadcrumbs} />
        <AccessDenied what="site templates" />
      </>
    );
  }

  const items = await headerFooterService.listHeaderFooters();

  return (
    <>
      <PageHeader title={TITLE} breadcrumbs={breadcrumbs} />
      <HeaderFooterList
        items={items}
        initialTab={initialTab}
        can={{
          create: access.permissions.includes(PERMISSIONS.PAGES_CREATE),
          delete: access.permissions.includes(PERMISSIONS.PAGES_DELETE),
        }}
      />
    </>
  );
}
