import { cookies, draftMode } from 'next/headers';
import { NextResponse } from 'next/server';
import { PAGES } from '@/config/pages';
import { PERMISSIONS } from '@/config/permissions';
import { validateSession } from '@/lib/auth';
import { accessService } from '@/server/services/access.service';
import { previewService } from '@/server/services/preview.service';
import { publicSiteService } from '@/server/services/public-site.service';
import { PREVIEW_PAGE_COOKIE, PREVIEW_TOKEN_COOKIE } from '@/server/services/preview-session';

const cookieOptions = { httpOnly: true, sameSite: 'lax' as const, secure: process.env.NODE_ENV === 'production', path: '/' };

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get('token');
  const pageIdParam = url.searchParams.get('pageId');
  const jar = await cookies();

  let pageId: string | null = null;

  if (token) {
    pageId = await previewService.consume(token);
    if (!pageId) return new NextResponse('This preview link is invalid, expired, or revoked.', { status: 404 });
    jar.set(PREVIEW_TOKEN_COOKIE, token, cookieOptions);
    jar.delete(PREVIEW_PAGE_COOKIE);
  } else if (pageIdParam) {
    const session = await validateSession();
    if (!session) return NextResponse.redirect(new URL(PAGES.AUTH.LOGIN, url));
    const access = await accessService.getUserAccess(session.user.id);
    if (!accessService.can(access, PERMISSIONS.PAGES_EDIT)) {
      return new NextResponse('You do not have permission to preview drafts.', { status: 403 });
    }
    pageId = pageIdParam;
    jar.set(PREVIEW_PAGE_COOKIE, pageId, cookieOptions);
    jar.delete(PREVIEW_TOKEN_COOKIE);
  } else {
    return new NextResponse('Missing token or pageId', { status: 400 });
  }

  const route = await publicSiteService.getPageRouteById(pageId);
  if (!route) return new NextResponse('Page not found', { status: 404 });

  (await draftMode()).enable();
  return NextResponse.redirect(new URL(PAGES.SITE.page(route.slug, route.language, route.isHome), url));
}
