import { NextResponse } from 'next/server';
import { redirectsService } from '@/server/services/redirects.service';

/** Edge proxy cannot use the Node Postgres driver, so it asks this route for one indexed lookup. */
export async function GET(request: Request) {
  const path = new URL(request.url).searchParams.get('path') ?? '';
  try {
    const row = await redirectsService.find(path);
    if (!row) return NextResponse.json({ to: null });
    return NextResponse.json({ to: row.toPath, status: row.statusCode });
  } catch {
    return NextResponse.json({ to: null });
  }
}
