import { cookies, draftMode } from 'next/headers';
import { NextResponse } from 'next/server';
import { PREVIEW_PAGE_COOKIE, PREVIEW_TOKEN_COOKIE } from '@/server/services/preview-session';

export async function GET(request: Request) {
  (await draftMode()).disable();
  const jar = await cookies();
  jar.delete(PREVIEW_PAGE_COOKIE);
  jar.delete(PREVIEW_TOKEN_COOKIE);

  const url = new URL(request.url);
  const back = url.searchParams.get('redirect');
  const target = back && back.startsWith('/') && !back.startsWith('//') ? back : '/';
  return NextResponse.redirect(new URL(target, url));
}
