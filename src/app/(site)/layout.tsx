import { headers } from 'next/headers';
import Link from 'next/link';
import Script from 'next/script';
import { fontStylesheetUrl, themeStyle } from '@/builder/theme';
import { LanguageSwitcher } from '@/components/site/language-switcher';
import { PAGES } from '@/config/pages';
import { siteHref } from '@/lib/utils/site-href';
import { getPreviewSession } from '@/server/services/preview-session';
import {
  type MenuWithItems,
  publicSiteService,
  resolveRoute,
} from '@/server/services/public-site.service';
import { resolvePostRoute } from '@/server/services/blog.service';
import { maybePublishScheduled } from '@/server/services/scheduler';
import {
  siteContext,
  sitePathSegments,
  siteSlugPrefix,
} from '@/server/services/site-context';
import {
  localizedSettings,
  siteSettingsService,
} from '@/server/services/site-settings.service';

/** Menu URLs may be saved with or without the site slug; prefix only once. */
function menuHref(url: string, siteSlug?: string) {
  if (siteSlug && (url === `/${siteSlug}` || url.startsWith(`/${siteSlug}/`)))
    return url;
  return siteHref(url, siteSlug);
}

function MenuLinks({
  menu,
  className,
  siteSlug,
}: {
  menu?: MenuWithItems;
  className?: string;
  siteSlug?: string;
}) {
  if (!menu?.items.length) return null;
  return (
    <ul className={className}>
      {menu.items.map(item => (
        <li key={item.id} className="group relative">
          <a
            href={menuHref(item.url, siteSlug)}
            target={item.target}
            rel={item.target === '_blank' ? 'noopener noreferrer' : undefined}
            className="inline-flex items-center gap-1.5 hover:opacity-80"
          >
            {item.label}
            {item.badge && (
              <span className="s-soft-primary rounded-full px-1.5 py-0.5 text-[10px] font-semibold">
                {item.badge}
              </span>
            )}
          </a>
          {item.children.length > 0 && (
            <ul className="s-border invisible absolute left-0 top-full z-20 min-w-44 rounded-md border bg-[var(--site-bg)] p-2 opacity-0 shadow-lg transition group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
              {item.children.map(child => (
                <li key={child.id}>
                  <a
                    href={menuHref(child.url, siteSlug)}
                    target={child.target}
                    className="block rounded px-2 py-1.5 text-sm hover:opacity-80"
                  >
                    {child.label}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </li>
      ))}
    </ul>
  );
}

export default async function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  maybePublishScheduled();
  const [settings, site, preview, headerStore] = await Promise.all([
    siteSettingsService.getPublic(),
    siteContext.publicSite(),
    getPreviewSession(),
    headers(),
  ]);
  const pathname = headerStore.get('x-pathname') ?? '/';
  const segments = sitePathSegments(pathname, site);
  const siteSlug = siteSlugPrefix(site);
  const language =
    resolvePostRoute(segments, site)?.language ??
    resolveRoute(segments, site)?.language ??
    site.defaultLocale;
  const copy = localizedSettings(settings, language, site.defaultLocale);
  const [header, footer] = await Promise.all([
    publicSiteService.menuFor('header', language, site),
    publicSiteService.menuFor('footer', language, site),
  ]);
  const exitPreviewHref = preview
    ? `${PAGES.SITE.EXIT_PREVIEW}?redirect=${encodeURIComponent(
        preview.viaToken
          ? '/'
          : preview.postId
            ? PAGES.DASHBOARD.POSTS.EDIT(preview.postId)
            : PAGES.DASHBOARD.PAGES.EDIT(preview.pageId ?? '')
      )}`
    : null;
  const fontUrl = fontStylesheetUrl(settings.themeTokens);
  const mode = settings.themeTokens.colorMode === 'dark' ? 'dark' : 'light';

  return (
    <div
      className="site-root flex min-h-screen flex-col"
      data-site-theme={mode}
      style={themeStyle(settings.themeTokens)}
    >
      {fontUrl && <link rel="stylesheet" href={fontUrl} precedence="default" />}
      {exitPreviewHref && (
        <div
          role="status"
          className="sticky top-0 z-50 flex items-center justify-center gap-3 bg-amber-400 px-4 py-2 text-sm font-medium text-amber-950"
        >
          You are viewing an unpublished draft.
          <a href={exitPreviewHref} className="underline underline-offset-2">
            Exit preview
          </a>
        </div>
      )}
      <header className="s-border border-b">
        <nav
          aria-label="Main"
          className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-4 md:px-8"
        >
          <Link href={siteHref('/', siteSlug)} className="flex items-center gap-2 text-lg font-bold">
            {settings.logo && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={settings.logo}
                alt=""
                className="size-8 rounded object-cover"
              />
            )}
            {copy.siteName}
          </Link>
          <div className="flex flex-wrap items-center gap-5">
            <MenuLinks
              menu={header ?? undefined}
              siteSlug={siteSlug}
              className="flex flex-wrap items-center gap-5 text-sm font-medium"
            />
            <LanguageSwitcher />
          </div>
        </nav>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="s-border s-surface border-t">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-10 md:flex-row md:items-start md:justify-between md:px-8">
          <div>
            <p className="font-semibold">{copy.siteName}</p>
            {copy.siteDescription && (
              <p className="s-muted mt-1 max-w-sm text-sm">
                {copy.siteDescription}
              </p>
            )}
          </div>
          <MenuLinks
            menu={footer ?? undefined}
            siteSlug={siteSlug}
            className="s-muted flex flex-wrap gap-x-6 gap-y-2 text-sm"
          />
        </div>
        <p className="s-muted pb-8 text-center text-xs">
          © {new Date().getFullYear()} {copy.siteName}
        </p>
      </footer>
      {settings.googleAnalyticsId &&
        /^G-[A-Z0-9]+$/i.test(settings.googleAnalyticsId) && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${settings.googleAnalyticsId}`}
              strategy="afterInteractive"
            />
            <Script id="ga-init" strategy="afterInteractive">
              {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${settings.googleAnalyticsId}');`}
            </Script>
          </>
        )}
    </div>
  );
}
