import { NextResponse } from 'next/server';
import { licenseService } from '@/server/services/license.service';

export const dynamic = 'force-dynamic';

function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp.trim();
  return '127.0.0.1';
}

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
