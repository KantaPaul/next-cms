import { AlertTriangle, ArrowLeft, ExternalLink } from 'lucide-react';
import Link from '@/components/atoms/next/link';
import { notFound } from 'next/navigation';
import { AccessDenied } from '@/components/organisms/access-denied';
import { PageHeader } from '@/components/organisms/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PAGES } from '@/config/pages';
import { PERMISSIONS } from '@/config/permissions';
import { metaObject } from '@/lib/utils/metadata';
import { pluginsService } from '@/server/plugins/plugins.service';
import { requirePermission } from '@/server/services/require-permission';
import { PluginSettingsForm } from '../_components/plugin-settings-form';

export const metadata = { ...metaObject('Plugin Settings') };

export default async function PluginSettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { allowed } = await requirePermission(PERMISSIONS.SETTINGS_MANAGE);
  const breadcrumbs = [
    { title: 'Dashboard', href: PAGES.DASHBOARD.ROOT },
    { title: 'Plugins', href: PAGES.DASHBOARD.PLUGINS },
    { title: id, href: PAGES.DASHBOARD.PLUGIN_SETTINGS(id) },
  ];

  if (!allowed) {
    return (
      <>
        <PageHeader title="Plugin Settings" breadcrumbs={breadcrumbs} />
        <AccessDenied what="plugin settings" />
      </>
    );
  }

  const plugin = await pluginsService.getForAdmin(id);
  if (!plugin) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={plugin.name}
        breadcrumbs={[
          { title: 'Dashboard', href: PAGES.DASHBOARD.ROOT },
          { title: 'Plugins', href: PAGES.DASHBOARD.PLUGINS },
          { title: plugin.name, href: PAGES.DASHBOARD.PLUGIN_SETTINGS(id) },
        ]}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild size="sm" variant="outline">
            <Link href={PAGES.DASHBOARD.PLUGINS}>
              <ArrowLeft className="me-1.5 size-3.5" />
              Back to Plugins
            </Link>
          </Button>
          <Badge variant={plugin.enabled ? 'default' : 'secondary'}>
            {plugin.enabled ? 'Enabled' : plugin.status === 'available' ? 'Available' : 'Disabled'}
          </Badge>
          <span className="font-mono text-xs text-muted-foreground">
            v{plugin.version}
          </span>
        </div>

        {plugin.enabled && plugin.adminPages.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {plugin.adminPages.map(page => (
              <Button key={page.slug} asChild size="sm" variant="outline">
                <Link href={PAGES.DASHBOARD.PLUGIN_PAGE(plugin.id, page.slug)}>
                  {page.title}
                  <ExternalLink className="ms-1.5 size-3" />
                </Link>
              </Button>
            ))}
          </div>
        )}
      </div>

      {plugin.lastError && (
        <div
          role="alert"
          className="flex max-w-2xl items-start gap-2 rounded-md border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-900 dark:border-rose-800/60 dark:bg-rose-950/40 dark:text-rose-200"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-rose-600 dark:text-rose-400" />
          <div>
            <span className="font-medium">Last plugin error:</span>{' '}
            {plugin.lastError}
          </div>
        </div>
      )}

      <PluginSettingsForm
        pluginId={plugin.id}
        pluginName={plugin.name}
        description={plugin.description}
        fields={plugin.fields}
        initialValues={plugin.values}
      />
    </div>
  );
}
