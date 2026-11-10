import { NextResponse } from 'next/server';
import { importJobService } from '@/server/import/job.service';
import { requireImportAdmin } from '../../_auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  context: { params: Promise<{ jobId: string }> }
) {
  const auth = await requireImportAdmin();
  if (!auth.ok) return auth.response;

  const { jobId } = await context.params;
  try {
    const { job, entries } = await importJobService.getReport(jobId, auth.access);
    const format = new URL(request.url).searchParams.get('format');
    if (format === 'csv') {
      const csv = importJobService.reportToCsv(entries);
      return new Response(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="import-report-${job.id}.csv"`,
          'Cache-Control': 'no-store',
        },
      });
    }
    return NextResponse.json({ job, entries });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Report not found' },
      { status: 404 }
    );
  }
}
