import { NextResponse } from 'next/server';
import { backupService } from '@/server/backup/backup.service';
import { requireBackupAdmin } from '../../_auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireBackupAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const loaded = await backupService.readBackupZip(id, auth.siteId);
  if (!loaded) {
    return NextResponse.json({ error: 'Backup not found' }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(loaded.data), {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="backup-${loaded.backup.id}.zip"`,
      'Cache-Control': 'no-store',
    },
  });
}
