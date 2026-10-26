import { NextResponse } from 'next/server';
import { mediaService } from '@/app/(admin)/dashboard/(shell)/media/_modules/media.service';
import { validateSession } from '@/lib/auth';
import { accessService } from '@/server/services/access.service';

const toNumber = (value: ReturnType<FormData['get']>) => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
};

/** Multipart upload endpoint. Server actions cap request bodies at 1 MB, so uploads use a route handler. */
export async function POST(request: Request) {
  const session = await validateSession();
  if (!session)
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const form = await request.formData();
  const file = form.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ message: 'No file provided' }, { status: 400 });
  }

  try {
    const access = await accessService.getUserAccess(session.user.id);
    const row = await mediaService.upload(
      file,
      {
        folder: (form.get('folder') as string | null) ?? undefined,
        alt: (form.get('alt') as string | null) ?? undefined,
        width: toNumber(form.get('width')),
        height: toNumber(form.get('height')),
      },
      access
    );
    return NextResponse.json(row, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Upload failed' },
      { status: 400 }
    );
  }
}
