import { mediaService } from '@/app/(admin)/dashboard/(shell)/media/_modules/media.service';
import { siteContext } from '@/server/services/site-context';
import {
  absoluteUrl,
  apiHandler,
  apiOptions,
  enumParam,
  pagination,
} from '@/server/api/v1';
import { z } from 'zod';
import { NextResponse } from 'next/server';
import { ApiRequestError } from '@/server/api/v1';
import { PERMISSIONS } from '@/config/permissions';
import { accessService } from '@/server/services/access.service';
import { getCurrentUserAndTeamId } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export const GET = apiHandler(
  async (_request, { url, siteUrl }) => {
    const site = await siteContext.publicSite();
    const { page, limit } = pagination(url, 40);
    const type = enumParam(url, 'type', ['image', 'video', 'document'] as const);
    const { data, total } = await mediaService.list({
      search: url.searchParams.get('q') ?? undefined,
      folder: url.searchParams.get('folder') ?? undefined,
      type,
      page,
      size: limit,
      siteId: site.id,
    });

    return {
      data: data.map(({ uploadedBy: _uploadedBy, ...item }) => ({
        ...item,
        url: absoluteUrl(siteUrl, item.url),
      })),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  },
  ['content:read']
);

export const POST = apiHandler(
  async (request) => {
    const { userId } = await getCurrentUserAndTeamId();
    const access = await accessService.getUserAccess(userId);
    if (!accessService.can(access, PERMISSIONS.MEDIA_UPLOAD)) {
      throw new ApiRequestError(403, 'Missing media.upload permission.');
    }

    const site = await siteContext.publicSite();
    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof File)) {
      throw new ApiRequestError(400, 'No file provided.');
    }

    const folder = (form.get('folder') as string | null) ?? undefined;

    const row = await mediaService.upload(
      file,
      { folder, siteId: site.id },
      access
    );

    return NextResponse.json({
      id: row.id,
      url: row.url,
      filename: row.filename,
    });
  },
  ['media:write']
);

export const OPTIONS = apiOptions;
