import { createId } from '@paralleldrive/cuid2';
import { cookies, headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { analyticsService } from '@/server/services/analytics.service';

const COOKIE = 'cms_vid';
const MAX_AGE = 60 * 60 * 24 * 365; // 1 year

export async function POST(request: Request) {
  let body: {
    pageId?: string;
    postId?: string;
    path?: string;
    referrer?: string | null;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: 'invalid_json' },
      { status: 400 }
    );
  }

  const pageId = typeof body.pageId === 'string' ? body.pageId.trim() : '';
  const postId = typeof body.postId === 'string' ? body.postId.trim() : '';
  const path = typeof body.path === 'string' ? body.path.trim() : '';
  if (!path || (!pageId && !postId) || (pageId && postId)) {
    return NextResponse.json(
      { ok: false, error: 'missing_fields' },
      { status: 400 }
    );
  }

  const jar = await cookies();
  const hdrs = await headers();

  // Skip when a preview session is active
  if (jar.get('cms_preview')?.value || jar.get('__prerender_bypass')?.value) {
    return NextResponse.json({ ok: true, recorded: false, reason: 'preview' });
  }

  let visitorId = jar.get(COOKIE)?.value;
  const isNew = !visitorId;
  if (!visitorId) visitorId = createId();

  const result = await analyticsService.recordView({
    pageId: pageId || null,
    postId: postId || null,
    path,
    referrer: body.referrer ?? hdrs.get('referer'),
    visitorId,
    userAgent: hdrs.get('user-agent'),
  });

  const res = NextResponse.json({ ok: true, ...result });
  if (isNew) {
    res.cookies.set(COOKIE, visitorId, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: MAX_AGE,
    });
  }
  return res;
}
