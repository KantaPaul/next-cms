import { LANGUAGE_CODES } from '@/db/schemas/shared.schema';
import {
  absoluteUrl,
  apiHandler,
  apiOptions,
  enumParam,
  pagination,
} from '@/server/api/v1';
import { BLOG_SORTS, blogService } from '@/server/services/blog.service';

export const dynamic = 'force-dynamic';

/** Published posts. Filters: `lang`, `q`, `category` and `tag` (id or slug), `sort` (newest, oldest, title). */
export const GET = apiHandler(async (_request, { url, siteUrl }) => {
  const language = enumParam(url, 'lang', LANGUAGE_CODES);
  const { page, limit } = pagination(url);
  const result = await blogService.list({
    language,
    q: url.searchParams.get('q'),
    category: url.searchParams.get('category'),
    tag: url.searchParams.get('tag'),
    sort: enumParam(url, 'sort', BLOG_SORTS),
    page,
    size: limit,
  });

  return {
    data: result.posts.map(p => ({ ...p, url: absoluteUrl(siteUrl, p.url) })),
    meta: {
      page: result.page,
      limit: result.size,
      total: result.total,
      totalPages: result.totalPages,
    },
  };
});

export const OPTIONS = apiOptions;
