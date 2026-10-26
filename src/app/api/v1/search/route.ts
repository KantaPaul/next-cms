import { LANGUAGE_CODES } from '@/db/schemas/shared.schema';
import {
  absoluteUrl,
  ApiRequestError,
  apiHandler,
  apiOptions,
  enumParam,
} from '@/server/api/v1';
import { searchIndex } from '@/server/services/search.service';

export const dynamic = 'force-dynamic';

export const GET = apiHandler(async (_request, { url, siteUrl }) => {
  const q = url.searchParams.get('q')?.trim() ?? '';
  if (!q) throw new ApiRequestError(400, 'Query "q" is required.');
  const language = enumParam(url, 'lang', LANGUAGE_CODES);
  const rows = await searchIndex.search({ q, language });
  return {
    data: rows.map(row => ({
      ...row,
      url: absoluteUrl(siteUrl, row.path),
    })),
    meta: { q, lang: language ?? null },
  };
});

export const OPTIONS = apiOptions;
