import { NextResponse } from 'next/server';
import { z } from 'zod';
import { importJobService } from '@/server/import/job.service';
import { requireImportAdmin } from '../_auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const patchSchema = z.object({
  status: z.enum(['running', 'cancelled', 'parsed']).optional(),
  options: z
    .object({
      downloadMedia: z.boolean().optional(),
      importAsDrafts: z.boolean().optional(),
      createRedirects: z.boolean().optional(),
      importComments: z.boolean().optional(),
      importAuthors: z.boolean().optional(),
      templateTarget: z.enum(['page_template', 'global_block']).optional(),
    })
    .optional(),
});

export async function GET(
  _request: Request,
  context: { params: Promise<{ jobId: string }> }
) {
  const auth = await requireImportAdmin();
  if (!auth.ok) return auth.response;

  const { jobId } = await context.params;
  try {
    const job = await importJobService.getJob(jobId, auth.access);
    return NextResponse.json({ job });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Not found' },
      { status: 404 }
    );
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ jobId: string }> }
) {
  const auth = await requireImportAdmin();
  if (!auth.ok) return auth.response;

  const { jobId } = await context.params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid update payload.' },
      { status: 400 }
    );
  }

  try {
    const job = await importJobService.updateJob(jobId, parsed.data, auth.access);
    return NextResponse.json({ job });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Update failed' },
      { status: 404 }
    );
  }
}
