import { PAGES } from '@/config/pages';
import { LANGUAGE_CODES } from '@/db/schemas/shared.schema';
import {
  absoluteUrl,
  apiHandler,
  apiOptions,
  enumParam,
  pagination,
} from '@/server/api/v1';
import { contentApiService } from '@/server/services/content-api.service';

export const dynamic = 'force-dynamic';

export const GET = apiHandler(async (_request, { url, siteUrl }) => {
  const language = enumParam(url, 'lang', LANGUAGE_CODES);
  const { page, limit, offset } = pagination(url);
  const { data, total } = await contentApiService.listPublishedPages({
    language,
    limit,
    offset,
  });

  return {
    data: data.map(p => ({
      ...p,
      url: absoluteUrl(siteUrl, PAGES.SITE.page(p.slug, p.language, p.isHome)),
    })),
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
});

export const OPTIONS = apiOptions;
