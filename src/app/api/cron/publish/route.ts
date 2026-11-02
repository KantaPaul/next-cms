import { NextResponse } from 'next/server';
import { pagesServices } from '@/app/(admin)/dashboard/(shell)/pages/_modules/pages.service';
import { postsService } from '@/app/(admin)/dashboard/(shell)/posts/_modules/posts.service';
import { licenseService } from '@/server/services/license.service';
import { env } from '@/env.mjs';

export const dynamic = 'force-dynamic';

/**
 * Publishes scheduled pages and posts whose time has passed and sweeps expired licenses.
 * Call it every minute from a scheduler with `Authorization: Bearer $CRON_SECRET`.
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

  // L5-04 / R241: Call requireLicense for cron mutations
  const licenseCheck = await licenseService.requireLicense();
  if (!licenseCheck.ok) {
    return NextResponse.json(
      { message: 'License verification required to execute scheduled tasks', error: licenseCheck.error },
      { status: 403 }
    );
  }

  try {
    const [published, publishedPosts, sweptLicenses] = await Promise.all([
      pagesServices.publishDueScheduled(),
      postsService.publishDueScheduled(),
      licenseService.sweepExpiredLicenses(), // R233 / L3-06
    ]);
    return NextResponse.json({ published, publishedPosts, sweptLicenses });
  } catch (error) {
    console.error('[cron/publish] failed', error);
    return NextResponse.json({ message: 'Cron failed' }, { status: 500 });
  }
}

export const POST = GET;
