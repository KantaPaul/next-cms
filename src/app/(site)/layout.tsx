import { cookies } from 'next/headers';
import { fontStylesheetUrl, themeStyle } from '@/builder/theme';
import { buildCustomFontsCss } from '@/builder/fonts';
import { sanitizeCss } from '@/builder/sanitize';
import { MotionEffectsClient } from '@/builder/motion-effects-client';
import { AdminBar } from '@/components/site/admin-bar';
import { ConsentBanner } from '@/components/site/consent-banner';
import { ConsentProvider } from '@/components/site/consent-provider';
import { CustomCode } from '@/components/site/custom-code';
import { GoogleAnalytics } from '@/components/site/google-analytics';
import { PAGES } from '@/config/pages';
import { CONSENT_COOKIE_NAME } from '@/lib/consent';
import { getPreviewSession } from '@/server/services/preview-session';
import { maybePublishScheduled } from '@/server/services/scheduler';
import { siteContext, siteSlugPrefix } from '@/server/services/site-context';
import { siteSettingsService } from '@/server/services/site-settings.service';
import { siteModeScript } from '@/builder/site-mode';

/**
 * Site shell: theme, admin bar, preview banner, consent, and analytics. Header and footer
 * are rendered per route by `SiteChrome` (see `[[...slug]]/layout.tsx`), because
 * this layout is not re-rendered on client navigation between public pages.
 */
export default async function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  maybePublishScheduled();
  const [settings, site, preview, jar] = await Promise.all([
    siteSettingsService.getPublic(),
    siteContext.publicSite(),
    getPreviewSession(),
    cookies(),
  ]);
  const siteSlug = siteSlugPrefix(site);
  const consentCookie = jar.get(CONSENT_COOKIE_NAME)?.value ?? null;
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
  const customFontsCss = buildCustomFontsCss(settings.customFonts);
  const customCode = settings.customCode;
  const customCodeCats = settings.consent?.customCodeCategories;
  const colorMode = settings.themeTokens.colorMode;
  const mode =
    colorMode === 'dark' || colorMode === 'system' ? colorMode : 'light';
  const hasValidGa =
    Boolean(settings.googleAnalyticsId) &&
    /^G-[A-Z0-9]+$/i.test(settings.googleAnalyticsId ?? '');

  return (
    <div
      className="site-root flex min-h-screen flex-col"
      data-site-theme={mode}
      style={themeStyle(settings.themeTokens)}
    >
      {/* Before paint: apply the visitor's saved mode, or the OS mode for "system". */}
      <script
        // biome-ignore lint/security/noDangerouslySetInnerHtml: static, no user input
        dangerouslySetInnerHTML={{ __html: siteModeScript(mode) }}
      />
      {/* Consent Mode v2 defaults (all denied until visitor grants consent). */}
      {hasValidGa && (
        <script
          // biome-ignore lint/security/noDangerouslySetInnerHtml: static Consent Mode v2 defaults
          dangerouslySetInnerHTML={{
            __html:
              "window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('consent','default',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'denied'});",
          }}
        />
      )}
      {fontUrl && <link rel="stylesheet" href={fontUrl} precedence="default" />}
      {customFontsCss ? (
        <style
          // biome-ignore lint/security/noDangerouslySetInnerHtml: internal font definitions
          dangerouslySetInnerHTML={{ __html: customFontsCss }}
        />
      ) : null}
      {customCode?.css ? (
        <style
          // biome-ignore lint/security/noDangerouslySetInnerHtml: sanitized admin custom CSS
          dangerouslySetInnerHTML={{ __html: sanitizeCss(customCode.css) }}
        />
      ) : null}
      <ConsentProvider
        settings={settings.consent}
        initialCookie={consentCookie}
        siteSlug={siteSlug}
      >
        {customCode?.headHtml ? (
          <CustomCode
            html={customCode.headHtml}
            slot="head"
            category={customCodeCats?.headHtml ?? 'marketing'}
          />
        ) : null}
        {customCode?.bodyStartHtml ? (
          <CustomCode
            html={customCode.bodyStartHtml}
            slot="bodyStart"
            category={customCodeCats?.bodyStartHtml ?? 'marketing'}
          />
        ) : null}
        <AdminBar />
        <MotionEffectsClient />
        {exitPreviewHref && (
          <div
            role="status"
            className="sticky top-[var(--cms-admin-bar-h,0px)] z-50 flex items-center justify-center gap-3 bg-amber-400 px-4 py-2 text-sm font-medium text-amber-950"
          >
            You are viewing an unpublished draft.
            <a href={exitPreviewHref} className="underline underline-offset-2">
              Exit preview
            </a>
          </div>
        )}
        {children}
        {customCode?.bodyEndHtml ? (
          <CustomCode
            html={customCode.bodyEndHtml}
            slot="bodyEnd"
            category={customCodeCats?.bodyEndHtml ?? 'marketing'}
          />
        ) : null}
        <ConsentBanner siteSlug={siteSlug} />
        <GoogleAnalytics measurementId={settings.googleAnalyticsId} />
      </ConsentProvider>
    </div>
  );
}
