import { NextResponse } from 'next/server';
import { z } from 'zod';
import { backupService } from '@/server/backup/backup.service';
import { requireBackupAdmin } from './_auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const createSchema = z.object({
  includeMedia: z.boolean().default(true),
});

export async function GET() {
  const auth = await requireBackupAdmin();
  if (!auth.ok) return auth.response;

  const list = await backupService.listBackups(auth.siteId);
  return NextResponse.json({ backups: list });
}

export async function POST(request: Request) {
  const auth = await requireBackupAdmin();
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => ({}));
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }

  const backup = await backupService.createBackupJob({
    siteId: auth.siteId,
    kind: 'manual',
    includeMedia: parsed.data.includeMedia,
    createdBy: auth.access.userId,
  });

  return NextResponse.json({ backup });
}
