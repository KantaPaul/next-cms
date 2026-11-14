import { AccessDenied } from '@/components/organisms/access-denied';
import { PageHeader } from '@/components/organisms/page-header';
import { PAGES } from '@/config/pages';
import { PERMISSIONS } from '@/config/permissions';
import { getCurrentUserAndTeamId } from '@/lib/auth';
import { metaObject } from '@/lib/utils/metadata';
import { backupService } from '@/server/backup/backup.service';
import { requirePermission } from '@/server/services/require-permission';
import { siteContext } from '@/server/services/site-context';
import { siteSettingsService } from '@/server/services/site-settings.service';
import { BackupsManager } from './_components/backups-manager';

const TITLE = 'Backups';

export const metadata = { ...metaObject(TITLE) };

export default async function BackupsToolPage() {
  const { allowed } = await requirePermission(PERMISSIONS.SETTINGS_MANAGE);
  const breadcrumbs = [
    { title: 'Dashboard', href: PAGES.DASHBOARD.ROOT },
    { title: 'Tools', href: PAGES.DASHBOARD.TOOLS_IMPORT },
    { title: 'Backups', href: PAGES.DASHBOARD.TOOLS_BACKUPS },
  ];

  if (!allowed) {
    return (
      <>
        <PageHeader title={TITLE} breadcrumbs={breadcrumbs} />
        <AccessDenied />
      </>
    );
  }

  const { userId } = await getCurrentUserAndTeamId();
  const [site, settings] = await Promise.all([
    siteContext.adminSite(userId),
    siteSettingsService.get(),
  ]);
  const rows = await backupService.listBackups(site.id);

  return (
    <>
      <PageHeader title={TITLE} breadcrumbs={breadcrumbs} />
      <BackupsManager
        siteName={site.name}
        initialSchedule={settings.backupSettings}
        initialBackups={rows.map(b => ({
          id: b.id,
          kind: b.kind,
          status: b.status,
          size: Number(b.size ?? 0),
          includeMedia: b.includeMedia,
          manifest: b.manifest ?? null,
          progress: b.progress ?? null,
          error: b.error ?? null,
          createdAt: b.createdAt.toISOString(),
        }))}
      />
    </>
  );
}
