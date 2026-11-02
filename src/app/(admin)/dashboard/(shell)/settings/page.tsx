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
import { ExportWebsiteButton } from '@/components/dashboard/export-website-button';
import { menusService } from '../menus/_modules/menus.service';
import { templatesService } from '../templates/_modules/templates.service';
import { SettingsForm } from './_components/settings-form';
import { SettingsNav } from './_components/settings-nav';

const TITLE = 'Settings';

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
  const [settings, authSettings, menus, site, globalBlocks, pageTemplatesList] = await Promise.all([
    siteSettingsService.get(),
    siteSettingsService.getAuthSettings(),
    menusService.list(),
    siteContext.adminSite(userId),
    templatesService.listGlobalBlocks(),
    templatesService.listTemplates(),
  ]);

  return (
    <>
      <PageHeader title={TITLE} breadcrumbs={breadcrumbs}>
        <ExportWebsiteButton showTextOnMobile variant="secondary" className="border text-foreground" />
      </PageHeader>
      <SettingsNav />
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
          searchTemplateId: settings.searchTemplateId ?? null,
          archiveTemplateId: settings.archiveTemplateId ?? null,
          robotsTxt: settings.robotsTxt,
          googleAnalyticsId: settings.googleAnalyticsId,
          seoTitle: settings.seoTitle ?? null,
          seoDescription: settings.seoDescription ?? null,
          translations: settings.translations ?? null,
          themeTokens: settings.themeTokens,
          videoSettings: settings.videoSettings ?? null,
          searchSettings: {
            synonyms: Object.entries(settings.searchSettings?.synonyms ?? {}).map(
              ([term, synonyms]) => ({
                term,
                synonyms: Array.isArray(synonyms) ? synonyms : [],
              })
            ),
            pinnedResults: settings.searchSettings?.pinnedResults ?? [],
          },
          authSettings,
        }}
        menus={menus.map(m => ({
          id: m.id,
          title: m.title,
          location: m.location,
          language: m.language,
        }))}
        templates={[
          ...globalBlocks.map(g => ({
            id: g.id,
            name: `${g.name} (${g.category})`,
            category: g.category,
            kind: 'global' as const,
          })),
          ...pageTemplatesList.map(t => ({
            id: t.id,
            name: `${t.name} (page template · ${t.category})`,
            category: t.category,
            kind: 'page' as const,
          })),
        ]}
        locales={site.locales}
        defaultLocale={site.defaultLocale}
        fallbackSiteUrl={env.SITE_URL}
      />
    </>
  );
}
