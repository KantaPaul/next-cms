import { PAGES } from '@/config/pages';
import {
  absoluteUrl,
  apiHandler,
  apiOptions,
  enumParam,
  pagination,
} from '@/server/api/v1';
import { contentApiService } from '@/server/services/content-api.service';
import { siteContext } from '@/server/services/site-context';

export const dynamic = 'force-dynamic';

export const GET = apiHandler(async (_request, { url, siteUrl }) => {
  const site = await siteContext.publicSite();
  const language = enumParam(
    url,
    'lang',
    site.locales.map(locale => locale.code)
  );
  const { page, limit, offset } = pagination(url);
  const { data, total } = await contentApiService.listPublishedPages({
    language,
    limit,
    offset,
  });

  return {
    data: data.map(p => ({
      ...p,
      url: absoluteUrl(
        siteUrl,
        PAGES.SITE.page(p.slug, p.language, p.isHome, site.defaultLocale)
      ),
    })),
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
});

export const OPTIONS = apiOptions;
