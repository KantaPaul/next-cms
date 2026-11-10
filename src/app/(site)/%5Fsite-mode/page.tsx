import type { Metadata } from 'next';
import { getGlobalBlockContent } from '@/app/(admin)/dashboard/(shell)/templates/_modules/templates.actions';
import { renderBuilderContent } from '@/builder/render-content';
import { siteContext, siteSlugPrefix } from '@/server/services/site-context';
import { siteSettingsService } from '@/server/services/site-settings.service';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const settings = await siteSettingsService.getPublic();
  const isComingSoon = settings.siteMode?.mode === 'coming_soon';
  const label = isComingSoon ? 'Coming Soon' : 'Maintenance';
  return {
    title: `${settings.siteName} — ${label}`,
    description: settings.siteDescription ?? undefined,
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default async function SiteModePage() {
  const [settings, site] = await Promise.all([
    siteSettingsService.getPublic(),
    siteContext.publicSite(),
  ]);

  const mode = settings.siteMode?.mode ?? 'maintenance';
  const pageBlockId = settings.siteMode?.pageBlockId;

  if (pageBlockId) {
    try {
      const block = await getGlobalBlockContent(pageBlockId, {
        siteId: site.id,
      });
      if (
        block &&
        (block.blocks?.length ||
          (block.content &&
            typeof block.content === 'object' &&
            Object.keys(block.content).length > 0))
      ) {
        const rendered = await renderBuilderContent({
          content: block.content,
          metadata: {
            globalBlock: { id: block.id },
            themeTokens: settings.themeTokens,
            language: site.defaultLocale,
            siteId: site.id,
            siteSlug: siteSlugPrefix(site),
          },
        });
        return <main className="flex-1">{rendered}</main>;
      }
    } catch {
      // Fall back to the built-in default screen if the global block fails to load.
    }
  }

  const isComingSoon = mode === 'coming_soon';

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="s-surface s-border s-radius w-full max-w-lg border p-8 text-center shadow-sm sm:p-10">
        {settings.logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={settings.logo}
            alt={settings.siteName}
            className="mx-auto mb-6 h-12 w-auto max-w-[180px] object-contain"
          />
        ) : (
          <div className="s-soft-primary s-primary-text mx-auto mb-6 inline-flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold">
            {settings.siteName.slice(0, 1).toUpperCase()}
          </div>
        )}
        <p className="s-primary-text text-xs font-semibold uppercase tracking-widest">
          {isComingSoon ? 'Coming soon' : 'Scheduled maintenance'}
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
          {settings.siteName}
        </h1>
        <p className="s-muted mt-3 text-sm leading-relaxed sm:text-base">
          {isComingSoon
            ? 'We are putting the finishing touches on something new. Check back soon.'
            : 'We are performing brief maintenance to improve your experience. Please check back shortly.'}
        </p>
        {settings.siteDescription && (
          <p className="s-muted mt-4 border-t border-[var(--site-border)] pt-4 text-xs">
            {settings.siteDescription}
          </p>
        )}
      </div>
    </main>
  );
}
