import { AccessDenied } from '@/components/organisms/access-denied';
import { PageHeader } from '@/components/organisms/page-header';
import { PAGES } from '@/config/pages';
import { PERMISSIONS } from '@/config/permissions';
import { env } from '@/env.mjs';
import { metaObject } from '@/lib/utils/metadata';
import { requirePermission } from '@/server/services/require-permission';
import { siteSettingsService } from '@/server/services/site-settings.service';
import { SettingsNav } from '../_components/settings-nav';
import { LicenseSettingsView } from './_components/license-settings-view';

const TITLE = 'License Settings';

export const metadata = {
  ...metaObject(TITLE),
};

export default async function LicenseSettingsPage() {
  const { allowed } = await requirePermission(PERMISSIONS.SETTINGS_MANAGE);
  const breadcrumbs = [
    { title: 'Dashboard', href: PAGES.DASHBOARD.ROOT },
    { title: 'Settings', href: PAGES.DASHBOARD.SETTINGS },
    { title: 'License', href: PAGES.DASHBOARD.SETTINGS_LICENSE },
  ];

  if (!allowed) {
    return (
      <>
        <PageHeader title={TITLE} breadcrumbs={breadcrumbs} />
        <AccessDenied />
      </>
    );
  }

  const settings = await siteSettingsService.get();

  return (
    <>
      <PageHeader title={TITLE} breadcrumbs={breadcrumbs} />
      <SettingsNav />
      <LicenseSettingsView
        licenseSettings={settings.licenseSettings}
        envInfo={{
          role: env.LICENSE_ROLE,
          enforcement: env.LICENSE_ENFORCEMENT,
          envLicenseKey: env.LICENSE_KEY,
          envAuthorityUrl: env.LICENSE_AUTHORITY_URL,
        }}
      />
    </>
  );
}
