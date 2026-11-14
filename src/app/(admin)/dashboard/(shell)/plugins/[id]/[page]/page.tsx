import { ArrowLeft } from 'lucide-react';
import Link from '@/components/atoms/next/link';
import { notFound } from 'next/navigation';
import { AccessDenied } from '@/components/organisms/access-denied';
import { PageHeader } from '@/components/organisms/page-header';
import { Button } from '@/components/ui/button';
import { PAGES } from '@/config/pages';
import { PERMISSIONS, type PermissionKey } from '@/config/permissions';
import { metaObject } from '@/lib/utils/metadata';
import { CLIENT_PLUGINS_BY_ID } from '@/plugins/generated/client-registry';
import { SERVER_PLUGINS_BY_ID } from '@/plugins/generated/server-registry';
import { pluginsService } from '@/server/plugins/plugins.service';
import { requirePermission } from '@/server/services/require-permission';
import { adminSiteId } from '@/server/services/site-context';

export const metadata = { ...metaObject('Plugin Page') };

export default async function PluginAdminPageRoute({
  params,
}: {
  params: Promise<{ id: string; page: string }>;
}) {
  const { id, page: pageSlug } = await params;

  const serverDef = SERVER_PLUGINS_BY_ID[id];
  const clientDef = CLIENT_PLUGINS_BY_ID[id];
  const adminPage = clientDef?.adminPages?.find(p => p.slug === pageSlug);

  if (!serverDef || !adminPage) {
    notFound();
  }

  const siteId = await adminSiteId();
  const enabled = await pluginsService.isEnabled(siteId, id);
  if (!enabled) {
    notFound();
  }

  const requiredPermission = (adminPage.permission ??
    PERMISSIONS.SETTINGS_MANAGE) as PermissionKey;
  const { allowed } = await requirePermission(requiredPermission);

  const breadcrumbs = [
    { title: 'Dashboard', href: PAGES.DASHBOARD.ROOT },
    { title: 'Plugins', href: PAGES.DASHBOARD.PLUGINS },
    { title: serverDef.name, href: PAGES.DASHBOARD.PLUGIN_SETTINGS(id) },
    { title: adminPage.title, href: PAGES.DASHBOARD.PLUGIN_PAGE(id, pageSlug) },
  ];

  if (!allowed) {
    return (
      <>
        <PageHeader title={adminPage.title} breadcrumbs={breadcrumbs} />
        <AccessDenied />
      </>
    );
  }

  const detail = await pluginsService.getForAdmin(id, siteId);
  const PageComponent = adminPage.component;

  return (
    <div className="space-y-6">
      <PageHeader title={adminPage.title} breadcrumbs={breadcrumbs} />
      <div>
        <Button asChild size="sm" variant="outline">
          <Link href={PAGES.DASHBOARD.PLUGIN_SETTINGS(id)}>
            <ArrowLeft className="me-1.5 size-3.5" />
            {serverDef.name} Settings
          </Link>
        </Button>
      </div>
      <PageComponent
        pluginId={id}
        pluginName={serverDef.name}
        pageSlug={pageSlug}
        settings={detail?.values ?? {}}
      />
    </div>
  );
}
