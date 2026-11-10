import { NextResponse } from 'next/server';
import { env } from '@/env.mjs';
import { backupService } from '@/server/backup/backup.service';
import { licenseService } from '@/server/services/license.service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Runs scheduled site backups and prunes old scheduled backups keeping the last N.
 * Authenticated with `Authorization: Bearer $CRON_SECRET`.
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

  const licenseCheck = await licenseService.requireLicense();
  if (!licenseCheck.ok) {
    return NextResponse.json(
      {
        message: 'License verification required to execute scheduled tasks',
        error: licenseCheck.error,
      },
      { status: 403 }
    );
  }

  try {
    const results = await backupService.runScheduledBackups();
    return NextResponse.json({ ok: true, results });
  } catch (error) {
    console.error('[cron/backup] failed', error);
    return NextResponse.json({ message: 'Cron failed' }, { status: 500 });
  }
}

export const POST = GET;
