import { NextResponse } from 'next/server';
import { db } from '@/db';
import { licenses, licenseInstallations } from '@/db/schemas/licenses.schema';
import { eq } from 'drizzle-orm';
import { verifyInstallationRequest } from '@/lib/license/installation';
import { licenseService } from '@/server/services/license.service';

export const dynamic = 'force-dynamic';

/**
 * GET /api/licenses/status (R237 / L4-04)
 * Returns status, expiry, and bound installation public id for a signed installation.
 * Omits key hash, prefix, and owner email.
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const installationPublicId =
      request.headers.get('x-installation-id') || url.searchParams.get('installationPublicId');
    const signature =
      request.headers.get('x-signature') || url.searchParams.get('signature');
    const timestamp = Number(
      request.headers.get('x-timestamp') || url.searchParams.get('timestamp')
    );
    const nonce = request.headers.get('x-nonce') || url.searchParams.get('nonce');

    if (!installationPublicId || !signature || !timestamp || !nonce) {
      return NextResponse.json(
        { error: 'Missing required signed installation credentials' },
        { status: 400 }
      );
    }

    const nonceValid = await licenseService.recordAndVerifyNonce(nonce);
    if (!nonceValid) {
      return NextResponse.json({ error: 'Replay detected or duplicate request' }, { status: 400 });
    }

    const [inst] = await db
      .select({
        id: licenseInstallations.id,
        publicId: licenseInstallations.publicId,
        publicKey: licenseInstallations.publicKey,
        licenseId: licenseInstallations.licenseId,
        status: licenseInstallations.status,
      })
      .from(licenseInstallations)
      .where(eq(licenseInstallations.publicId, installationPublicId))
      .limit(1);

    if (!inst) {
      return NextResponse.json({ error: 'Installation not found' }, { status: 404 });
    }

    const sigCheck = verifyInstallationRequest({
      payload: { action: 'status' },
      signature,
      timestamp,
      nonce,
      publicKeyPem: inst.publicKey,
    });

    if (!sigCheck.valid) {
      return NextResponse.json({ error: sigCheck.error || 'Invalid signature' }, { status: 401 });
    }

    const [license] = await db
      .select({
        publicId: licenses.publicId,
        status: licenses.status,
        expiresAt: licenses.expiresAt,
        issuedAt: licenses.issuedAt,
        activatedAt: licenses.activatedAt,
        productId: licenses.productId,
      })
      .from(licenses)
      .where(eq(licenses.id, inst.licenseId))
      .limit(1);

    if (!license) {
      return NextResponse.json({ error: 'License not found' }, { status: 404 });
    }

    // Return status, expiry, and bound installation public id only (omits key hash, prefix, and owner email)
    return NextResponse.json({
      licensePublicId: license.publicId,
      productId: license.productId,
      status: license.status,
      expiresAt: license.expiresAt,
      issuedAt: license.issuedAt,
      activatedAt: license.activatedAt,
      boundInstallationPublicId: inst.publicId,
      installationStatus: inst.status,
    });
  } catch (err) {
    console.error('[licenses/status] error:', err);
    return NextResponse.json({ error: 'Failed to retrieve license status' }, { status: 500 });
  }
}
