import { NextResponse } from 'next/server';
import { backupService } from '@/server/backup/backup.service';
import { requireBackupAdmin } from '../_auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireBackupAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const deleted = await backupService.deleteBackup(id, auth.siteId, auth.access);
  if (!deleted) {
    return NextResponse.json({ error: 'Backup not found' }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
