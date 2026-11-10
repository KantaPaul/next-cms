import { AccessDenied } from '@/components/organisms/access-denied';
import { PageHeader } from '@/components/organisms/page-header';
import { PAGES } from '@/config/pages';
import { PERMISSIONS } from '@/config/permissions';
import { metaObject } from '@/lib/utils/metadata';
import { pluginsService } from '@/server/plugins/plugins.service';
import { requirePermission } from '@/server/services/require-permission';
import { PluginsList } from './_components/plugins-list';

const TITLE = 'Plugins';

export const metadata = { ...metaObject(TITLE) };

export default async function PluginsPage() {
  const { allowed } = await requirePermission(PERMISSIONS.SETTINGS_MANAGE);
  const breadcrumbs = [
    { title: 'Dashboard', href: PAGES.DASHBOARD.ROOT },
    { title: TITLE, href: PAGES.DASHBOARD.PLUGINS },
  ];

  if (!allowed) {
    return (
      <>
        <PageHeader title={TITLE} breadcrumbs={breadcrumbs} />
        <AccessDenied what="plugins" />
      </>
    );
  }

  const items = await pluginsService.listForDashboard();

  return (
    <>
      <PageHeader title={TITLE} breadcrumbs={breadcrumbs} />
      <PluginsList plugins={items} />
    </>
  );
}
