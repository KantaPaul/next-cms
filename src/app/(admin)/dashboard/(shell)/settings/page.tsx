import { AccessDenied } from '@/components/organisms/access-denied';
import { PageHeader } from '@/components/organisms/page-header';
import { PAGES } from '@/config/pages';
import { PERMISSIONS } from '@/config/permissions';
import { env } from '@/env.mjs';
import { metaObject } from '@/lib/utils/metadata';
import { requirePermission } from '@/server/services/require-permission';
import { siteSettingsService } from '@/server/services/site-settings.service';
import { menusService } from '../menus/_modules/menus.service';
import { SettingsForm } from './_components/settings-form';

const TITLE = 'Settings & Theme';

export const metadata = {
  ...metaObject(TITLE),
};

export default async function SettingsPage() {
  const { allowed } = await requirePermission(PERMISSIONS.SETTINGS_MANAGE);
  const breadcrumbs = [
    { title: 'Dashboard', href: PAGES.DASHBOARD.ROOT },
    { title: TITLE, href: PAGES.DASHBOARD.SETTINGS },
  ];

  if (!allowed) {
    return (
      <>
        <PageHeader title={TITLE} breadcrumbs={breadcrumbs} />
        <AccessDenied what="site settings" />
      </>
    );
  }

  const [settings, menus] = await Promise.all([siteSettingsService.get(), menusService.list()]);

  return (
    <>
      <PageHeader title={TITLE} breadcrumbs={breadcrumbs} />
      <SettingsForm
        settings={{
          siteName: settings.siteName,
          siteDescription: settings.siteDescription,
          siteUrl: settings.siteUrl,
          logo: settings.logo,
          favicon: settings.favicon,
          defaultOgImage: settings.defaultOgImage,
          headerMenuId: settings.headerMenuId,
          footerMenuId: settings.footerMenuId,
          robotsTxt: settings.robotsTxt,
          googleAnalyticsId: settings.googleAnalyticsId,
          themeTokens: settings.themeTokens,
        }}
        menus={menus.map(m => ({ id: m.id, title: m.title, location: m.location }))}
        fallbackSiteUrl={env.SITE_URL}
      />
    </>
  );
}
