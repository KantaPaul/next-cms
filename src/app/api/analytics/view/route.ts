import { createId } from '@paralleldrive/cuid2';
import { cookies, headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { analyticsService } from '@/server/services/analytics.service';
import { db } from '@/db';
import { eq } from 'drizzle-orm';
import { pageExperiments } from '@/db/schema';

const COOKIE = 'cms_vid';
const AB_COOKIE = 'cms_ab';
const MAX_AGE = 60 * 60 * 24 * 365; // 1 year
const AB_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export async function POST(request: Request) {
  let body: {
    pageId?: string;
    postId?: string;
    path?: string;
    referrer?: string | null;
    variant?: 'a' | 'b' | null;
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
  const isNewVisitor = !visitorId;
  if (!visitorId) visitorId = createId();

  // A/B experiment variant assignment
  let variant: 'a' | 'b' | null = body.variant ?? null;
  if (pageId && variant === null) {
    const [experiment] = await db
      .select()
      .from(pageExperiments)
      .where(eq(pageExperiments.pageId, pageId))
      .limit(1);

    if (experiment && experiment.status === 'running') {
      const stored = jar.get(AB_COOKIE)?.value;
      const [cookiePageId, cookieVariant] = (stored ?? '').split(':');
      const assignedVariant =
        cookiePageId === pageId && (cookieVariant === 'a' || cookieVariant === 'b')
          ? (cookieVariant as 'a' | 'b')
          : Math.floor(Math.random() * 100) + 1 <= (experiment.weight ?? 50)
            ? 'b'
            : 'a';
      variant = assignedVariant;
    }
  }

  const result = await analyticsService.recordView({
    pageId: pageId || null,
    postId: postId || null,
    path,
    referrer: body.referrer ?? hdrs.get('referer'),
    visitorId,
    userAgent: hdrs.get('user-agent'),
    variant: variant ?? undefined,
  });

  const res = NextResponse.json({ ok: true, ...result, variant });
  if (isNewVisitor) {
    res.cookies.set(COOKIE, visitorId, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: MAX_AGE,
    });
  }
  if (pageId && variant) {
    res.cookies.set(AB_COOKIE, `${pageId}:${variant}`, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: AB_MAX_AGE,
    });
  }
  return res;
}
