import { NextResponse } from 'next/server';
import { redirectsService } from '@/server/services/redirects.service';

/** Edge proxy cannot use the Node Postgres driver, so it asks this route for one indexed lookup. */
export async function GET(request: Request) {
  const path = new URL(request.url).searchParams.get('path') ?? '';
  const siteSlug = request.headers.get('x-cms-site-slug')?.trim();

  // Strip the site segment so redirects are matched within the site
  // (`/{site}/from` matches stored `from`), then re-prefix the target.
  const lookupPath =
    siteSlug && path.startsWith(`/${siteSlug}/`)
      ? path.slice(siteSlug.length)
      : path;
  try {
    const row = await redirectsService.find(lookupPath);
    if (!row) return NextResponse.json({ to: null });
    let to = row.toPath;
    if (siteSlug) to = `/${siteSlug}${to}`;
    return NextResponse.json({ to, status: row.statusCode });
  } catch {
    return NextResponse.json({ to: null });
  }
}
