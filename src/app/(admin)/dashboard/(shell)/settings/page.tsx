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
import { Download } from 'lucide-react';
import { menusService } from '../menus/_modules/menus.service';
import { templatesService } from '../templates/_modules/templates.service';
import { SettingsForm } from './_components/settings-form';

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
  const [settings, menus, site, globalBlocks, pageTemplatesList] = await Promise.all([
    siteSettingsService.get(),
    menusService.list(),
    siteContext.adminSite(userId),
    templatesService.listGlobalBlocks(),
    templatesService.listTemplates(),
  ]);

  return (
    <>
      <PageHeader title={TITLE} breadcrumbs={breadcrumbs}>
        <a
          href="/api/v1/export/site"
          download
          className="inline-flex items-center gap-2 rounded-md bg-secondary px-4 py-2 text-sm font-medium hover:bg-secondary/80 border text-foreground"
        >
          <Download className="h-4 w-4" />
          Export Website (.zip)
        </a>
      </PageHeader>
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
          })),
          ...pageTemplatesList.map(t => ({
            id: t.id,
            name: `${t.name} (${t.category})`,
            category: t.category,
          })),
        ]}
        locales={site.locales}
        defaultLocale={site.defaultLocale}
        fallbackSiteUrl={env.SITE_URL}
      />
    </>
  );
}
