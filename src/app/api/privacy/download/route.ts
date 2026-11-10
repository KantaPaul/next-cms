import { NextResponse } from 'next/server';
import { privacyService } from '@/server/services/privacy.service';

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get('token') ?? '';
  if (!token) {
    return NextResponse.json({ error: 'Missing token' }, { status: 400 });
  }

  const result = await privacyService.consumeOneTimeExport(token);
  if (!result) {
    return NextResponse.json(
      { error: 'Export link is invalid, expired, or already used.' },
      { status: 404 }
    );
  }

  return new NextResponse(new Uint8Array(result.data), {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${result.filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}
