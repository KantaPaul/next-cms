import { type Data, resolveAllData } from '@measured/puck';
import { z } from 'zod';
import { NextResponse } from 'next/server';
import { postBuilderConfig } from '@/builder/config';
import { sanitizeRichText } from '@/builder/sanitize';
import { PAGES } from '@/config/pages';
import {
  absoluteUrl,
  apiHandler,
  apiOptions,
  enumParam,
} from '@/server/api/v1';
import { blogService } from '@/server/services/blog.service';
import { siteContext } from '@/server/services/site-context';
import { siteSettingsService } from '@/server/services/site-settings.service';
import { ApiRequestError } from '@/server/api/v1';
import { PERMISSIONS } from '@/config/permissions';
import { accessService } from '@/server/services/access.service';
import { getCurrentUserAndTeamId } from '@/lib/auth';
import { db } from '@/db';
import { posts, postContents } from '@/db/schema';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

/** One published post. `body` is sanitized HTML; `layout` is the resolved builder tree the site renders. */
export const GET = apiHandler<{ slug: string }>(
  async (_request, { params, url, siteUrl }) => {
    const site = await siteContext.publicSite();
    const language =
      enumParam(
        url,
        'lang',
        site.locales.map(locale => locale.code)
      ) ?? site.defaultLocale;
    const post = await blogService.getPublished(
      language,
      decodeURIComponent(params.slug)
    );
    if (!post) return null;

    const settings = await siteSettingsService.getPublic();
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
        url: absoluteUrl(
          siteUrl,
          PAGES.SITE.post(view.slug, view.language, site.defaultLocale)
        ),
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
  },
  ['content:read']
);

const updatePostSchema = z.object({
  title: z.string().trim().min(1).max(255).optional(),
  slug: z.string().trim().min(1).max(255).optional(),
  body: z.string().optional(),
});

export const PATCH = apiHandler<{ slug: string }>(
  async (request, { params }) => {
    const postSlug = decodeURIComponent(params.slug);
    const { userId } = await getCurrentUserAndTeamId();
    const access = await accessService.getUserAccess(userId);
    if (!accessService.can(access, PERMISSIONS.PAGES_EDIT)) {
      throw new ApiRequestError(403, 'Missing pages.edit permission.');
    }

    const body = await request.json();
    const parsed = updatePostSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiRequestError(400, 'Invalid update data.');
    }

    const site = await siteContext.publicSite();
    const [existing] = await db
      .select({ id: posts.id, status: posts.status })
      .from(posts)
      .where(eq(posts.slug, postSlug))
      .limit(1);
    if (!existing) {
      throw new ApiRequestError(404, 'Post not found.');
    }
    if (existing.status === 'published') {
      throw new ApiRequestError(
        403,
        'Cannot patch a published post. Duplicate or edit in the dashboard.'
      );
    }

    const [updated] = await db
      .update(posts)
      .set({
        ...(parsed.data.title !== undefined ? { title: parsed.data.title } : {}),
        ...(parsed.data.slug !== undefined ? { slug: parsed.data.slug } : {}),
        updatedAt: new Date(),
      })
      .where(eq(posts.id, existing.id))
      .returning();

    if (parsed.data.body !== undefined) {
      await db
        .update(postContents)
        .set({ body: parsed.data.body, updatedAt: new Date() })
        .where(eq(postContents.postId, existing.id));
    }

    return NextResponse.json({ id: updated.id, status: updated.status });
  },
  ['content:write']
);

export const POST = apiHandler<{ slug: string }>(
  async (request, { params }) => {
    const postSlug = decodeURIComponent(params.slug);
    const { userId } = await getCurrentUserAndTeamId();
    const access = await accessService.getUserAccess(userId);
    if (!accessService.can(access, PERMISSIONS.PAGES_PUBLISH)) {
      throw new ApiRequestError(403, 'Missing pages.publish permission.');
    }

    const site = await siteContext.publicSite();
    const [post] = await db
      .select({ id: posts.id, status: posts.status })
      .from(posts)
      .where(eq(posts.slug, postSlug))
      .limit(1);
    if (!post) {
      throw new ApiRequestError(404, 'Post not found.');
    }

    await db
      .update(posts)
      .set({ status: 'published', publishedAt: new Date() })
      .where(eq(posts.id, post.id));

    return NextResponse.json({ id: post.id, status: 'published' });
  },
  ['content:write']
);

export const OPTIONS = apiOptions;
