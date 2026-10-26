import { type Data, resolveAllData } from '@measured/puck';
import { builderConfig } from '@/builder/config';
import { sanitizeRichText } from '@/builder/sanitize';
import { PAGES } from '@/config/pages';
import { DEFAULT_LANGUAGE, LANGUAGE_CODES } from '@/db/schemas/shared.schema';
import {
  absoluteUrl,
  apiHandler,
  apiOptions,
  enumParam,
} from '@/server/api/v1';
import { publicSiteService } from '@/server/services/public-site.service';
import { siteSettingsService } from '@/server/services/site-settings.service';

export const dynamic = 'force-dynamic';

/** `slug` is the page slug, or `home` for the language's home page when no page uses that slug. */
export const GET = apiHandler<{ slug: string }>(
  async (_request, { params, url, siteUrl }) => {
    const language = enumParam(url, 'lang', LANGUAGE_CODES) ?? DEFAULT_LANGUAGE;
    const slug = decodeURIComponent(params.slug);
    const page =
      (await publicSiteService.getPublished(language, slug)) ??
      (slug === 'home'
        ? await publicSiteService.getPublished(language, null)
        : null);
    if (!page) return null;

    const settings = await siteSettingsService.get();
    const content =
      page.editorType === 'builder'
        ? await resolveAllData(page.content as Data, builderConfig, {
            themeTokens: settings.themeTokens,
          })
        : sanitizeRichText(page.content);
    const link = (p: { slug: string; language: string; isHome: boolean }) =>
      absoluteUrl(siteUrl, PAGES.SITE.page(p.slug, p.language, p.isHome));

    const {
      seo,
      alternates,
      isDraft: _isDraft,
      status: _status,
      visibility: _visibility,
      ...rest
    } = page;
    return {
      data: {
        ...rest,
        url: link(page),
        content,
        seo: seo && {
          title: seo.title,
          description: seo.description,
          keywords: seo.keywords,
          canonicalUrl: seo.canonicalUrl,
          noIndex: seo.noIndex,
          ogTitle: seo.ogTitle,
          ogDescription: seo.ogDescription,
          ogImage: seo.ogImage,
          ogType: seo.ogType,
          twitterCard: seo.twitterCard,
          structuredDataType: seo.structuredDataType,
        },
        alternates: alternates.map(alt => ({
          language: alt.language,
          slug: alt.slug,
          url: link(alt),
        })),
      },
    };
  }
);

export const OPTIONS = apiOptions;
