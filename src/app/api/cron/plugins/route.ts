import { NextResponse } from 'next/server';
import { env } from '@/env.mjs';
import { runDuePluginCrons } from '@/server/plugins/cron';

export const dynamic = 'force-dynamic';

/**
 * Runs due hourly/daily plugin cron jobs.
 * Call from a scheduler with `Authorization: Bearer $CRON_SECRET`.
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

  try {
    const result = await runDuePluginCrons();
    return NextResponse.json(result);
  } catch (error) {
    console.error('[cron/plugins] failed', error);
    return NextResponse.json({ message: 'Plugin cron failed' }, { status: 500 });
  }
}

export const POST = GET;
