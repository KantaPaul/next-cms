import { mediaService } from '@/app/(admin)/dashboard/(shell)/media/_modules/media.service';
import {
  absoluteUrl,
  apiHandler,
  apiOptions,
  enumParam,
  pagination,
} from '@/server/api/v1';

export const dynamic = 'force-dynamic';

export const GET = apiHandler(async (_request, { url, siteUrl }) => {
  const { page, limit } = pagination(url, 40);
  const type = enumParam(url, 'type', ['image', 'video', 'document'] as const);
  const { data, total } = await mediaService.list({
    search: url.searchParams.get('q') ?? undefined,
    folder: url.searchParams.get('folder') ?? undefined,
    type,
    page,
    size: limit,
  });

  return {
    data: data.map(({ uploadedBy: _uploadedBy, ...item }) => ({
      ...item,
      url: absoluteUrl(siteUrl, item.url),
    })),
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
});

export const OPTIONS = apiOptions;
