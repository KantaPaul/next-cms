import { NextResponse } from 'next/server';
import { env } from '@/env.mjs';
import { pagesServices } from '@/app/(admin)/dashboard/(shell)/pages/_modules/pages.service';
import { postsService } from '@/app/(admin)/dashboard/(shell)/posts/_modules/posts.service';

export const dynamic = 'force-dynamic';

/**
 * Publishes scheduled pages and posts whose time has passed. Call it every minute from a scheduler
 * (Vercel Cron, a system crontab, etc.) with `Authorization: Bearer $CRON_SECRET`.
 */
export async function GET(request: Request) {
  if (!env.CRON_SECRET) {
    return NextResponse.json(
      { message: 'CRON_SECRET is not configured' },
      { status: 503 }
    );
  }

  if (request.headers.get('authorization') !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const [published, publishedPosts] = await Promise.all([
    pagesServices.publishDueScheduled(),
    postsService.publishDueScheduled(),
  ]);
  return NextResponse.json({ published, publishedPosts });
}

export const POST = GET;
