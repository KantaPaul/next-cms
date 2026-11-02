import { NextResponse, type NextRequest } from 'next/server';
import { validateSession } from '@/lib/auth';
import { ADMIN_BAR_HINT_COOKIE } from '@/lib/admin-bar';
import { adminBarService } from '@/server/services/admin-bar.service';
import { getPreviewSession } from '@/server/services/preview-session';

export const dynamic = 'force-dynamic';

const noStore = { 'Cache-Control': 'private, no-store' };

/** Toolbar data for the public site's admin bar. Visitors get `{ bar: null }`. */
export async function GET(request: NextRequest) {
  const session = await validateSession();

  if (!session) {
    const response = NextResponse.json({ bar: null }, { headers: noStore });
    // Stale hint (expired or revoked session): stop the client asking again.
    response.cookies.delete(ADMIN_BAR_HINT_COOKIE);
    return response;
  }

  const raw = request.nextUrl.searchParams.get('path') ?? '/';
  const path = raw.startsWith('/') ? raw : `/${raw}`;
  const lang = request.nextUrl.searchParams.get('lang');

  const [bar, preview] = await Promise.all([
    adminBarService.forUser(session.user, path, lang),
    getPreviewSession(),
  ]);

  return NextResponse.json(
    { bar: bar && { ...bar, preview: !!preview } },
    { headers: noStore }
  );
}
