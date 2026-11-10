import { NextResponse } from 'next/server';
import { clientIp } from '@/server/lib/client-ip';
import { licenseService } from '@/server/services/license.service';

export const dynamic = 'force-dynamic';

// The first X-Forwarded-For entry is client-written; clientIp() takes the proxy-added one.
const getClientIp = (request: Request): string => clientIp(request.headers);

/**
 * POST /api/licenses/validate (R235 / L4-02)
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { installationPublicId, signature, timestamp, nonce } = body || {};

    if (!installationPublicId || !signature || !timestamp || !nonce) {
      return NextResponse.json({ error: 'Missing required validation fields' }, { status: 400 });
    }

    const ipAddress = getClientIp(request);

    const result = await licenseService.validateOrHeartbeat({
      installationPublicId,
      signature,
      timestamp: Number(timestamp),
      nonce: String(nonce),
      ipAddress,
      isHeartbeat: false,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ token: result.token });
  } catch (err) {
    console.error('[licenses/validate] error:', err);
    return NextResponse.json({ error: 'Validation failed' }, { status: 400 });
  }
}
