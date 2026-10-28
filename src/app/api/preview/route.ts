import { cookies, draftMode } from 'next/headers';
import { NextResponse } from 'next/server';
import { PAGES } from '@/config/pages';
import { PERMISSIONS } from '@/config/permissions';
import { validateSession } from '@/lib/auth';
import { accessService } from '@/server/services/access.service';
import { blogService } from '@/server/services/blog.service';
import {
  type PreviewTarget,
  previewService,
} from '@/server/services/preview.service';
import {
  PREVIEW_PAGE_COOKIE,
  PREVIEW_POST_COOKIE,
  PREVIEW_TOKEN_COOKIE,
} from '@/server/services/preview-session';
import { publicSiteService } from '@/server/services/public-site.service';
import { siteContext, siteSlugPrefix } from '@/server/services/site-context';

const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
};

async function routeFor(target: PreviewTarget, siteSlug: string) {
  if (target.postId) {
    const post = await blogService.getRouteById(target.postId);
    return post && PAGES.SITE.post(post.slug, post.language, siteSlug);
  }

  const page = target.pageId
    ? await publicSiteService.getPageRouteById(target.pageId)
    : null;
  return page && PAGES.SITE.page(page.slug, page.language, page.isHome, undefined, siteSlug);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get('token');
  const pageIdParam = url.searchParams.get('pageId');
  const postIdParam = url.searchParams.get('postId');
  const jar = await cookies();

  let target: PreviewTarget | null = null;

  if (token) {
    target = await previewService.consume(token);
    if (!target)
      return new NextResponse(
        'This preview link is invalid, expired, or revoked.',
        { status: 404 }
      );
    jar.set(PREVIEW_TOKEN_COOKIE, token, cookieOptions);
    jar.delete(PREVIEW_PAGE_COOKIE);
    jar.delete(PREVIEW_POST_COOKIE);
  } else if (pageIdParam || postIdParam) {
    const session = await validateSession();
    if (!session) return NextResponse.redirect(new URL(PAGES.AUTH.LOGIN, url));
    const access = await accessService.getUserAccess(session.user.id);

    if (!accessService.can(access, PERMISSIONS.PAGES_EDIT)) {
      return new NextResponse('You do not have permission to preview drafts.', {
        status: 403,
      });
    }

    target = { pageId: postIdParam ? null : pageIdParam, postId: postIdParam };
    jar.delete(PREVIEW_TOKEN_COOKIE);

    if (target.postId) {
      jar.set(PREVIEW_POST_COOKIE, target.postId, cookieOptions);
      jar.delete(PREVIEW_PAGE_COOKIE);
    } else if (target.pageId) {
      jar.set(PREVIEW_PAGE_COOKIE, target.pageId, cookieOptions);
      jar.delete(PREVIEW_POST_COOKIE);
    }
  } else {
    return new NextResponse('Missing token, pageId, or postId', {
      status: 400,
    });
  }

  const path = await routeFor(
    target,
    siteSlugPrefix(await siteContext.publicSite()) ?? ''
  );
  if (!path)
    return new NextResponse(
      target.postId ? 'Post not found' : 'Page not found',
      { status: 404 }
    );

  (await draftMode()).enable();
  return NextResponse.redirect(new URL(path, url));
}
