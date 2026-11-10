import { NextResponse } from 'next/server';
import { backupService } from '@/server/backup/backup.service';
import { requireBackupAdmin } from '../../_auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireBackupAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  try {
    const backup = await backupService.stepBackupJob(id, auth.siteId);
    return NextResponse.json({ backup });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Backup step failed' },
      { status: 400 }
    );
  }
}
