import { AccessDenied } from '@/components/organisms/access-denied';
import { PageHeader } from '@/components/organisms/page-header';
import { PAGES } from '@/config/pages';
import { PERMISSIONS } from '@/config/permissions';
import { metaObject } from '@/lib/utils/metadata';
import { requirePermission } from '@/server/services/require-permission';
import { siteSettingsService } from '@/server/services/site-settings.service';
import { ThemeForm } from './_components/theme-form';

const TITLE = 'Theme';

export const metadata = {
  ...metaObject(TITLE),
};

export default async function ThemePage() {
  const { allowed } = await requirePermission(PERMISSIONS.SETTINGS_MANAGE);
  const breadcrumbs = [
    { title: 'Dashboard', href: PAGES.DASHBOARD.ROOT },
    { title: TITLE, href: PAGES.DASHBOARD.THEME },
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
      <ThemeForm
        themeTokens={settings.themeTokens}
        siteName={settings.siteName}
        customFonts={settings.customFonts ?? []}
      />
    </>
  );
}
