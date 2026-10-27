import {
  absoluteUrl,
  apiHandler,
  apiOptions,
  enumParam,
  pagination,
} from '@/server/api/v1';
import { BLOG_SORTS, blogService } from '@/server/services/blog.service';
import { siteContext } from '@/server/services/site-context';
import { z } from 'zod';
import { NextResponse } from 'next/server';
import { ApiRequestError } from '@/server/api/v1';
import { PERMISSIONS } from '@/config/permissions';
import { accessService } from '@/server/services/access.service';
import { getCurrentUserAndTeamId } from '@/lib/auth';
import { db } from '@/db';
import { posts, postContents } from '@/db/schema';

const createPostSchema = z.object({
  title: z.string().trim().min(1).max(255),
  slug: z.string().trim().min(1).max(255),
  language: z.string().min(1).max(10),
  body: z.string().optional(),
});

export const dynamic = 'force-dynamic';

export const GET = apiHandler(
  async (_request, { url, siteUrl }) => {
    const site = await siteContext.publicSite();
    const language = enumParam(
      url,
      'lang',
      site.locales.map(locale => locale.code)
    );
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
  },
  ['content:read']
);

export const POST = apiHandler(
  async (request) => {
    const { userId } = await getCurrentUserAndTeamId();
    const access = await accessService.getUserAccess(userId);
    if (!accessService.can(access, PERMISSIONS.PAGES_CREATE)) {
      throw new ApiRequestError(403, 'Missing pages.create permission.');
    }

    const body = await request.json();
    const parsed = createPostSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiRequestError(400, 'Invalid post data.');
    }

    const siteId = await import('@/server/services/site-context').then(
      m => m.adminSiteId()
    );

    const [post] = await db
      .insert(posts)
      .values({
        siteId,
        title: parsed.data.title,
        slug: parsed.data.slug,
        language: parsed.data.language,
        status: 'draft',
        visibility: 'public',
        createdBy: userId,
      })
      .returning();

    await db.insert(postContents).values({
      postId: post.id,
      kind: 'draft',
      body: parsed.data.body ?? '',
    });

    return NextResponse.json({ id: post.id, status: post.status });
  },
  ['content:write']
);

export const OPTIONS = apiOptions;
