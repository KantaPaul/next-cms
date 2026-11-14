import { AccessDenied } from '@/components/organisms/access-denied';
import { PageHeader } from '@/components/organisms/page-header';
import { ExportWebsiteButton } from '@/components/dashboard/export-website-button';
import { PAGES } from '@/config/pages';
import { PERMISSIONS } from '@/config/permissions';
import { env } from '@/env.mjs';
import { getCurrentUserAndTeamId } from '@/lib/auth';
import { requirePermission } from '@/server/services/require-permission';
import { siteContext, siteSlugPrefix } from '@/server/services/site-context';
import { siteSettingsService } from '@/server/services/site-settings.service';
import { menusService } from '../../menus/_modules/menus.service';
import { templatesService } from '../../templates/_modules/templates.service';
import { SettingsForm, type SettingsSectionKey } from './settings-form';
import { SettingsNav } from './settings-nav';

/** Shared server shell for each split site-settings route. */
export async function SettingsSectionPage({
  title,
  href,
  section,
  activeLocale,
  showExport = false,
}: {
  title: string;
  href: string;
  section: SettingsSectionKey;
  activeLocale?: string;
  showExport?: boolean;
}) {
  const { allowed } = await requirePermission(PERMISSIONS.SETTINGS_MANAGE);
  const breadcrumbs =
    href === PAGES.DASHBOARD.SETTINGS
      ? [
          { title: 'Dashboard', href: PAGES.DASHBOARD.ROOT },
          { title: 'Settings', href: PAGES.DASHBOARD.SETTINGS },
        ]
      : [
          { title: 'Dashboard', href: PAGES.DASHBOARD.ROOT },
          { title: 'Settings', href: PAGES.DASHBOARD.SETTINGS },
          { title, href },
        ];

  if (!allowed) {
    return (
      <>
        <PageHeader title={title} breadcrumbs={breadcrumbs} />
        <AccessDenied what="site settings" />
      </>
    );
  }

  const { userId } = await getCurrentUserAndTeamId();
  const [settings, authSettings, menus, site, globalBlocks, pageTemplatesList] =
    await Promise.all([
      siteSettingsService.get(),
      siteSettingsService.getAuthSettings(),
      menusService.list(),
      siteContext.adminSite(userId),
      templatesService.listGlobalBlocks(),
      templatesService.listTemplates(),
    ]);

  return (
    <>
      <PageHeader title={title} breadcrumbs={breadcrumbs}>
        {showExport && (
          <ExportWebsiteButton
            showTextOnMobile
            variant="secondary"
            className="border text-foreground"
          />
        )}
      </PageHeader>
      <SettingsNav />
      <SettingsForm
        section={section}
        activeLocale={activeLocale}
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
          readingSettings: {
            postNavigation: settings.readingSettings?.postNavigation ?? 'auto',
            comments: settings.readingSettings?.comments ?? true,
            share: settings.readingSettings?.share ?? true,
            bookmark: settings.readingSettings?.bookmark ?? true,
          },
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
          siteMode: {
            mode: settings.siteMode?.mode ?? 'live',
            pageBlockId: settings.siteMode?.pageBlockId ?? null,
            bypassToken: settings.siteMode?.bypassToken ?? null,
            excludePaths: settings.siteMode?.excludePaths ?? [],
          },
        }}
        siteSlug={siteSlugPrefix(site) ?? null}
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
