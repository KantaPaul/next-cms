import { NextResponse } from 'next/server';
import { licenseService, GENERIC_LICENSE_ERROR } from '@/server/services/license.service';

export const dynamic = 'force-dynamic';

function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp.trim();
  return '127.0.0.1';
}

/**
 * POST /api/licenses/activate (R234 / L4-01)
 * Activates a license key for an installation's Ed25519 public key.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { licenseKey, installationPublicKey } = body || {};

    if (!licenseKey || typeof licenseKey !== 'string' || !installationPublicKey || typeof installationPublicKey !== 'string') {
      return NextResponse.json({ error: GENERIC_LICENSE_ERROR }, { status: 400 });
    }

    const ipAddress = getClientIp(request);

    const result = await licenseService.activateLicense({
      licenseKey,
      installationPublicKey,
      ipAddress,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      token: result.token,
      installationPublicId: result.installationPublicId,
    });
  } catch (err) {
    console.error('[licenses/activate] error:', err);
    return NextResponse.json({ error: GENERIC_LICENSE_ERROR }, { status: 400 });
  }
}
