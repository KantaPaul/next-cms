import { NextResponse } from 'next/server';
import { importJobService } from '@/server/import/job.service';
import { requireImportAdmin } from '../../_auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(
  _request: Request,
  context: { params: Promise<{ jobId: string }> }
) {
  const auth = await requireImportAdmin();
  if (!auth.ok) return auth.response;

  const { jobId } = await context.params;
  try {
    const job = await importJobService.stepJob(jobId, auth.access);
    return NextResponse.json({ job });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Import step failed' },
      { status: 400 }
    );
  }
}
