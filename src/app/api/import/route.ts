import { NextResponse } from 'next/server';
import { importJobService } from '@/server/import/job.service';
import { requireImportAdmin } from './_auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_IMPORT_BYTES = 100 * 1024 * 1024; // 100 MB
const MAX_BODY_BYTES = MAX_IMPORT_BYTES + 1024 * 1024;

export async function GET() {
  const auth = await requireImportAdmin();
  if (!auth.ok) return auth.response;

  const jobs = await importJobService.listJobs(auth.access);
  return NextResponse.json({ jobs });
}

export async function POST(request: Request) {
  const auth = await requireImportAdmin();
  if (!auth.ok) return auth.response;

  // Check body size before buffering multipart data in memory
  const contentLength = Number(request.headers.get('content-length') ?? 0);
  if (contentLength > MAX_BODY_BYTES) {
    return NextResponse.json(
      { error: 'Import file exceeds the 100 MB limit.' },
      { status: 413 }
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json(
      { error: 'Expected multipart form upload.' },
      { status: 400 }
    );
  }

  const file = form.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: 'Please select a .xml or .json file to upload.' },
      { status: 400 }
    );
  }

  const lower = file.name.toLowerCase();
  if (!lower.endsWith('.xml') && !lower.endsWith('.json')) {
    return NextResponse.json(
      {
        error:
          'Unsupported file type. Upload a WordPress WXR (.xml) or Elementor template (.json).',
      },
      { status: 400 }
    );
  }

  if (file.size === 0) {
    return NextResponse.json(
      { error: 'The uploaded file is empty.' },
      { status: 400 }
    );
  }

  if (file.size > MAX_IMPORT_BYTES) {
    return NextResponse.json(
      { error: 'Import file exceeds the 100 MB limit.' },
      { status: 413 }
    );
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const job = await importJobService.createJobFromUpload({
      filename: file.name,
      buffer,
      access: auth.access,
    });
    return NextResponse.json({ job }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : 'Failed to parse import file.',
      },
      { status: 400 }
    );
  }
}
