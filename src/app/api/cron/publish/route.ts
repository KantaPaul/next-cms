import { NextResponse } from 'next/server';
import { env } from '@/env.mjs';
import { pagesServices } from '@/app/(admin)/dashboard/(shell)/pages/_modules/pages.service';

export const dynamic = 'force-dynamic';

/**
 * Publishes scheduled pages whose time has passed. Call it every minute from a scheduler
 * (Vercel Cron, a system crontab, etc.) with `Authorization: Bearer $CRON_SECRET`.
 */
export async function GET(request: Request) {
  if (!env.CRON_SECRET) {
    return NextResponse.json({ message: 'CRON_SECRET is not configured' }, { status: 503 });
  }
  if (request.headers.get('authorization') !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const published = await pagesServices.publishDueScheduled();
  return NextResponse.json({ published });
}

export const POST = GET;
