import { NextResponse } from 'next/server';
import { clientIp } from '@/server/lib/client-ip';
import { licenseService } from '@/server/services/license.service';

export const dynamic = 'force-dynamic';

// The first X-Forwarded-For entry is client-written; clientIp() takes the proxy-added one.
const getClientIp = (request: Request): string => clientIp(request.headers);

/**
 * POST /api/licenses/deactivate (R236 / L4-03)
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { installationPublicId, signature, timestamp, nonce } = body || {};

    if (!installationPublicId || !signature || !timestamp || !nonce) {
      return NextResponse.json({ error: 'Missing required deactivation fields' }, { status: 400 });
    }

    const ipAddress = getClientIp(request);

    const result = await licenseService.deactivateLicense({
      installationPublicId,
      signature,
      timestamp: Number(timestamp),
      nonce: String(nonce),
      ipAddress,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[licenses/deactivate] error:', err);
    return NextResponse.json({ error: 'Deactivation failed' }, { status: 400 });
  }
}
