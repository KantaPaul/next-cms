import { NextResponse } from 'next/server';
import { z } from 'zod';
import { backupService } from '@/server/backup/backup.service';
import { requireBackupAdmin } from '../../_auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const restoreSchema = z.object({
  confirmSiteName: z.string().trim().min(1),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireBackupAdmin();
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => ({}));
  const parsed = restoreSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Please type the site name to confirm.' },
      { status: 400 }
    );
  }

  const { id } = await context.params;
  try {
    const result = await backupService.restoreBackup({
      backupId: id,
      siteId: auth.siteId,
      confirmSiteName: parsed.data.confirmSiteName,
      access: auth.access,
    });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Restore failed' },
      { status: 400 }
    );
  }
}
