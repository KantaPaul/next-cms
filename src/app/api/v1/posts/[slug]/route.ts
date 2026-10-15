import { resolveAllData, type Data } from '@measured/puck';
import { postBuilderConfig } from '@/builder/config';
import { sanitizeRichText } from '@/builder/sanitize';
import { PAGES } from '@/config/pages';
import { DEFAULT_LANGUAGE, LANGUAGE_CODES } from '@/db/schemas/shared.schema';
import {
  absoluteUrl,
  apiHandler,
  apiOptions,
  enumParam,
} from '@/server/api/v1';
import { blogService } from '@/server/services/blog.service';
import { siteSettingsService } from '@/server/services/site-settings.service';

export const dynamic = 'force-dynamic';

/** One published post. `body` is sanitized HTML; `layout` is the resolved builder tree the site renders. */
export const GET = apiHandler<{ slug: string }>(
  async (_request, { params, url, siteUrl }) => {
    const language = enumParam(url, 'lang', LANGUAGE_CODES) ?? DEFAULT_LANGUAGE;
    const post = await blogService.getPublished(
      language,
      decodeURIComponent(params.slug)
    );
    if (!post) return null;

    const settings = await siteSettingsService.get();
    const { view, seo } = post;
    const tree = await blogService.layoutFor(post);
    const layout = await resolveAllData(tree as Data, postBuilderConfig, {
      themeTokens: settings.themeTokens,
      post: view,
      language: view.language,
    });
    const { body, blogUrl, ...rest } = view;

    return {
      data: {
        ...rest,
        url: absoluteUrl(siteUrl, PAGES.SITE.post(view.slug, view.language)),
        blogUrl: blogUrl ? absoluteUrl(siteUrl, blogUrl) : null,
        updatedAt: post.updatedAt,
        body: sanitizeRichText(body),
        layoutType: post.layout,
        layout,
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
      },
    };
  }
);

export const OPTIONS = apiOptions;
