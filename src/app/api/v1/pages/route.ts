import { PAGES } from '@/config/pages';
import {
  absoluteUrl,
  apiHandler,
  apiOptions,
  enumParam,
  pagination,
  ApiRequestError,
} from '@/server/api/v1';
import { contentApiService } from '@/server/services/content-api.service';
import { siteContext, siteSlugPrefix } from '@/server/services/site-context';
import { NextResponse } from 'next/server';
import { pagesServices } from '@/app/(admin)/dashboard/(shell)/pages/_modules/pages.service';
import { PERMISSIONS } from '@/config/permissions';
import { accessService } from '@/server/services/access.service';
import { getCurrentUserAndTeamId } from '@/lib/auth';
import { apiCreatePageSchema } from '@/schemas/api/v1/pages';

export const dynamic = 'force-dynamic';

export const GET = apiHandler(
  async (_request, { url, siteUrl }) => {
    const site = await siteContext.publicSite();
    const siteSlug = siteSlugPrefix(site);
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
          PAGES.SITE.page(
            p.slug,
            p.language,
            p.isHome,
            site.defaultLocale,
            siteSlug
          )
        ),
      })),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  },
  ['content:read']
);

export const POST = apiHandler(
  async (request, { siteUrl }) => {
    const { userId } = await getCurrentUserAndTeamId();
    const access = await accessService.getUserAccess(userId);
    if (!accessService.can(access, PERMISSIONS.PAGES_CREATE)) {
      throw new ApiRequestError(403, 'Missing pages.create permission.');
    }

    const site = await siteContext.publicSite();
    const body = await request.json();
    const parsed = apiCreatePageSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiRequestError(400, 'Invalid page data.');
    }

    if (!site.locales.map(l => l.code).includes(parsed.data.language)) {
      throw new ApiRequestError(400, 'Unsupported language.');
    }

    const page = await pagesServices.create(
      {
        title: parsed.data.title,
        slug: parsed.data.slug,
        status: 'draft',
        visibility: 'public',
        editorType: 'builder',
        isHome: false,
        isBlogIndex: false,
        language: parsed.data.language,
        scheduledAt: null,
        content: parsed.data.content,
        headerTemplateId: null,
        footerTemplateId: null,
      },
      access
    );

    return NextResponse.json({ id: page.id, status: page.status });
  },
  ['content:write']
);

export const OPTIONS = apiOptions;
