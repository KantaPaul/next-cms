import { AccessDenied } from '@/components/organisms/access-denied';
import { PageHeader } from '@/components/organisms/page-header';
import { PAGES } from '@/config/pages';
import { PERMISSIONS } from '@/config/permissions';
import { metaObject } from '@/lib/utils/metadata';
import { requirePermission } from '@/server/services/require-permission';
import { HeaderFooterList } from './_components/header-footer-list';
import { headerFooterService } from './_modules/header-footer.service';

const TITLE = 'Header & Footer';

export const metadata = {
  ...metaObject(TITLE),
};

export default async function HeaderFooterPage() {
  const { access, allowed } = await requirePermission(PERMISSIONS.PAGES_EDIT);
  const breadcrumbs = [
    { title: 'Dashboard', href: PAGES.DASHBOARD.ROOT },
    { title: TITLE, href: PAGES.DASHBOARD.HEADER_FOOTER },
  ];

  if (!allowed) {
    return (
      <>
        <PageHeader title={TITLE} breadcrumbs={breadcrumbs} />
        <AccessDenied what="header and footer templates" />
      </>
    );
  }

  const items = await headerFooterService.listHeaderFooters();

  return (
    <>
      <PageHeader title={TITLE} breadcrumbs={breadcrumbs} />
      <HeaderFooterList
        items={items}
        can={{
          create: access.permissions.includes(PERMISSIONS.PAGES_CREATE),
          delete: access.permissions.includes(PERMISSIONS.PAGES_DELETE),
        }}
      />
    </>
  );
}
