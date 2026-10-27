import { type Data, resolveAllData } from '@measured/puck';
import { z } from 'zod';
import { NextResponse } from 'next/server';
import { builderConfig } from '@/builder/config';
import { sanitizeRichText } from '@/builder/sanitize';
import { PAGES } from '@/config/pages';
import {
  absoluteUrl,
  apiHandler,
  apiOptions,
  enumParam,
} from '@/server/api/v1';
import { publicSiteService } from '@/server/services/public-site.service';
import { siteContext } from '@/server/services/site-context';
import { siteSettingsService } from '@/server/services/site-settings.service';
import { pagesServices } from '@/app/(admin)/dashboard/(shell)/pages/_modules/pages.service';
import { ApiRequestError } from '@/server/api/v1';
import { PERMISSIONS } from '@/config/permissions';
import { accessService } from '@/server/services/access.service';
import { getCurrentUserAndTeamId } from '@/lib/auth';
import { db } from '@/db';
import { pages } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { webhookService } from '@/server/services/webhook.service';

export const dynamic = 'force-dynamic';

/** `slug` is the page slug, or `home` for the language's home page when no page uses that slug. */
export const GET = apiHandler<{ slug: string }>(
  async (_request, { params, url, siteUrl }) => {
    const site = await siteContext.publicSite();
    const language =
      enumParam(
        url,
        'lang',
        site.locales.map(locale => locale.code)
      ) ?? site.defaultLocale;
    const slug = decodeURIComponent(params.slug);
    const page =
      (await publicSiteService.getPublished(language, slug)) ??
      (slug === 'home'
        ? await publicSiteService.getPublished(language, null)
        : null);
    if (!page) return null;

    const settings = await siteSettingsService.getPublic();
    const content =
      page.editorType === 'builder'
        ? await resolveAllData(page.content as Data, builderConfig, {
            themeTokens: settings.themeTokens,
          })
        : sanitizeRichText(page.content);
    const link = (p: { slug: string; language: string; isHome: boolean }) =>
      absoluteUrl(
        siteUrl,
        PAGES.SITE.page(p.slug, p.language, p.isHome, site.defaultLocale)
      );

    const {
      seo,
      alternates,
      isDraft: _isDraft,
      status: _status,
      visibility: _visibility,
      ...rest
    } = page;
    return {
      data: {
        ...rest,
        url: link(page),
        content,
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
        alternates: alternates.map(alt => ({
          language: alt.language,
          slug: alt.slug,
          url: link(alt),
        })),
      },
    };
  },
  ['content:read']
);

const updatePageSchema = z.object({
  title: z.string().trim().min(1).max(255).optional(),
  slug: z.string().trim().min(1).max(255).optional(),
  content: z.unknown().optional(),
});

export const PATCH = apiHandler<{ slug: string }>(
  async (request, { params }) => {
    const pageSlug = decodeURIComponent(params.slug);
    const { userId } = await getCurrentUserAndTeamId();
    const access = await accessService.getUserAccess(userId);
    if (!accessService.can(access, PERMISSIONS.PAGES_EDIT)) {
      throw new ApiRequestError(403, 'Missing pages.edit permission.');
    }

    const body = await request.json();
    const parsed = updatePageSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiRequestError(400, 'Invalid update data.');
    }

    // Find the page by slug
    const site = await siteContext.publicSite();
    const [existing] = await db
      .select({ id: pages.id, status: pages.status })
      .from(pages)
      .where(eq(pages.slug, pageSlug))
      .limit(1);
    if (!existing) {
      throw new ApiRequestError(404, 'Page not found.');
    }
    if (existing.status === 'published') {
      throw new ApiRequestError(
        403,
        'Cannot patch a published page. Duplicate or edit in the dashboard.'
      );
    }

    const updated = await pagesServices.update(
      { id: existing.id, ...parsed.data },
      access
    );

    return NextResponse.json({ id: updated.id, status: updated.status });
  },
  ['content:write']
);

export const POST = apiHandler<{ slug: string }>(
  async (request, { params }) => {
    const pageSlug = decodeURIComponent(params.slug);
    const { userId } = await getCurrentUserAndTeamId();
    const access = await accessService.getUserAccess(userId);
    if (!accessService.can(access, PERMISSIONS.PAGES_PUBLISH)) {
      throw new ApiRequestError(403, 'Missing pages.publish permission.');
    }

    const site = await siteContext.publicSite();
    const [page] = await db
      .select({ id: pages.id, status: pages.status })
      .from(pages)
      .where(eq(pages.slug, pageSlug))
      .limit(1);
    if (!page) {
      throw new ApiRequestError(404, 'Page not found.');
    }

    await pagesServices.publish({ id: page.id }, access);

    await webhookService.deliver(
      page.id,
      'content.published',
      { id: page.id, type: 'page' },
      site.id
    );

    return NextResponse.json({ id: page.id, status: 'published' });
  },
  ['content:write']
);

export const OPTIONS = apiOptions;
