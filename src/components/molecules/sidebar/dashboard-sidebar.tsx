import { AlertTriangle } from 'lucide-react';
import Link from '@/components/atoms/next/link';
import { redirect } from 'next/navigation';
import { AppSidebar } from '@/components/molecules/sidebar/app-sidebar';
import Header from '@/components/organisms/header/header';
import {
  SidebarProvider as AppSidebarProvider,
  SidebarInset,
} from '@/components/ui/sidebar';
import { PAGES } from '@/config/pages';
import { normalizePostTypeSupports } from '@/config/post-types';
import { getSession } from '@/server/actions/auth.actions';
import { collectionsService } from '@/server/services/collections.service';
import { collectionTaxonomiesService } from '@/server/services/collection-taxonomies.service';
import { pluginsService } from '@/server/plugins/plugins.service';
import { siteSettingsService } from '@/server/services/site-settings.service';

/** Active post types for the sidebar; an empty list if they can't be loaded. */
async function sidebarPostTypes() {
  try {
    const rows = await collectionsService.list();
    const withTaxonomies = await Promise.all(
      rows.map(async c => {
        const taxonomies = await collectionTaxonomiesService
          .listTaxonomies(c.id)
          .catch(() => []);
        return {
          id: c.id,
          slug: c.slug,
          name: c.name,
          icon: c.icon,
          supports: normalizePostTypeSupports(c.supports),
          taxonomies: taxonomies.map(t => ({
            id: t.id,
            key: t.key,
            name: t.name,
          })),
        };
      })
    );
    return withTaxonomies;
  } catch {
    return [];
  }
}

async function sidebarPluginPages() {
  try {
    const items = await pluginsService.listForDashboard();
    return items
      .filter(p => p.enabled && p.adminPages.length > 0)
      .flatMap(p =>
        p.adminPages.map(page => ({
          name: page.navLabel ?? page.title,
          href: PAGES.DASHBOARD.PLUGIN_PAGE(p.id, page.slug),
          permission: page.permission,
        }))
      );
  } catch {
    return [];
  }
}

export default async function SidebarProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session?.user?.id) redirect('/login');
  const [postTypes, settings, pluginPages] = await Promise.all([
    sidebarPostTypes(),
    siteSettingsService.get().catch(() => null),
    sidebarPluginPages(),
  ]);
  const siteMode = settings?.siteMode?.mode ?? 'live';
  const backupFailed = settings?.backupSettings?.lastStatus === 'failed';
  const backupError = settings?.backupSettings?.lastError;

  return (
    <AppSidebarProvider>
      <AppSidebar postTypes={postTypes} pluginPages={pluginPages} />
      <SidebarInset>
        <Header />
        {siteMode !== 'live' && (
          <div
            role="status"
            className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-300 bg-amber-50 px-5 py-2 text-xs font-medium text-amber-950 xl:px-8 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-200"
          >
            <span className="inline-flex items-center gap-2">
              <AlertTriangle className="size-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
              {siteMode === 'coming_soon'
                ? 'Coming soon mode is active — public visitors see the coming-soon screen (200 noindex).'
                : 'Maintenance mode is active — public visitors see a 503 maintenance page.'}
            </span>
            <Link
              href={PAGES.DASHBOARD.SETTINGS}
              className="underline underline-offset-2 hover:opacity-80"
            >
              Manage in Settings
            </Link>
          </div>
        )}
        {backupFailed && (
          <div
            role="alert"
            className="flex flex-wrap items-center justify-between gap-2 border-b border-rose-300 bg-rose-50 px-5 py-2 text-xs font-medium text-rose-950 xl:px-8 dark:border-rose-800/60 dark:bg-rose-950/40 dark:text-rose-200"
          >
            <span className="inline-flex items-center gap-2">
              <AlertTriangle className="size-3.5 shrink-0 text-rose-600 dark:text-rose-400" />
              Last scheduled backup failed{backupError ? `: ${backupError}` : '.'}
            </span>
            <Link
              href={PAGES.DASHBOARD.TOOLS_BACKUPS}
              className="underline underline-offset-2 hover:opacity-80"
            >
              View backups
            </Link>
          </div>
        )}
        <div className="bg-background text-foreground @container flex h-full flex-1 flex-col p-5 has-[.sticky-footer]:pb-28 xl:p-8">
          {children}
        </div>
      </SidebarInset>
    </AppSidebarProvider>
  );
}
