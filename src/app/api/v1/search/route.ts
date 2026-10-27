import {
  absoluteUrl,
  ApiRequestError,
  apiHandler,
  apiOptions,
  enumParam,
} from '@/server/api/v1';
import { searchIndex } from '@/server/services/search.service';
import { siteContext } from '@/server/services/site-context';

export const dynamic = 'force-dynamic';

export const GET = apiHandler(
  async (_request, { url, siteUrl }) => {
    const q = url.searchParams.get('q')?.trim() ?? '';
    if (!q) throw new ApiRequestError(400, 'Query "q" is required.');
    const site = await siteContext.publicSite();
    const language = enumParam(
      url,
      'lang',
      site.locales.map(locale => locale.code)
    );
    const rows = await searchIndex.search({ q, language });
    return {
      data: rows.map(row => ({
        ...row,
        url: absoluteUrl(siteUrl, row.path),
      })),
      meta: { q, lang: language ?? null },
    };
  },
  ['content:read']
);

export const OPTIONS = apiOptions;
