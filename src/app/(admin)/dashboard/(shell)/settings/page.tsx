import { AccessDenied } from '@/components/organisms/access-denied';
import { PageHeader } from '@/components/organisms/page-header';
import { PAGES } from '@/config/pages';
import { PERMISSIONS } from '@/config/permissions';
import { env } from '@/env.mjs';
import { metaObject } from '@/lib/utils/metadata';
import { requirePermission } from '@/server/services/require-permission';
import { siteContext } from '@/server/services/site-context';
import { siteSettingsService } from '@/server/services/site-settings.service';
import { getCurrentUserAndTeamId } from '@/lib/auth';
import { menusService } from '../menus/_modules/menus.service';
import { templatesService } from '../templates/_modules/templates.service';
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

  const { userId } = await getCurrentUserAndTeamId();
  const [settings, menus, site, globalBlocks] = await Promise.all([
    siteSettingsService.get(),
    menusService.list(),
    siteContext.adminSite(userId),
    templatesService.listGlobalBlocks(),
  ]);

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
          headerTemplateId: settings.headerTemplateId ?? null,
          footerTemplateId: settings.footerTemplateId ?? null,
          robotsTxt: settings.robotsTxt,
          googleAnalyticsId: settings.googleAnalyticsId,
          seoTitle: settings.seoTitle ?? null,
          seoDescription: settings.seoDescription ?? null,
          translations: settings.translations ?? null,
          themeTokens: settings.themeTokens,
          videoSettings: settings.videoSettings ?? null,
        }}
        menus={menus.map(m => ({
          id: m.id,
          title: m.title,
          location: m.location,
          language: m.language,
        }))}
        templates={globalBlocks.map(g => ({
          id: g.id,
          name: g.name,
          category: g.category,
        }))}
        locales={site.locales}
        defaultLocale={site.defaultLocale}
        fallbackSiteUrl={env.SITE_URL}
      />
    </>
  );
}
