import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { media } from '@/db/schema';
import { storage } from '@/server/storage';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ key: string[] }> }
) {
  const { key: parts } = await params;
  const key = parts.map(decodeURIComponent).join('/');

  const driver = storage();
  if (!driver.read) return new Response('Not found', { status: 404 });

  const [row] = await db
    .select({ mime: media.mime })
    .from(media)
    .where(eq(media.key, key))
    .limit(1);
  if (!row) return new Response('Not found', { status: 404 });

  const body = await driver.read(key).catch(() => null);
  if (!body) return new Response('Not found', { status: 404 });

  return new Response(new Uint8Array(body), {
    headers: {
      'Content-Type': row.mime,
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
      ...(row.mime === 'image/svg+xml' && {
        'Content-Security-Policy':
          "default-src 'none'; style-src 'unsafe-inline'",
      }),
    },
  });
}
