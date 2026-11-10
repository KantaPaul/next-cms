import { NextResponse } from 'next/server';
import { PERMISSIONS } from '@/config/permissions';
import { validateSession } from '@/lib/auth';
import { accessService } from '@/server/services/access.service';
import { privacyService } from '@/server/services/privacy.service';
import { adminSiteId } from '@/server/services/site-context';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const session = await validateSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const access = await accessService.getUserAccess(session.user.id);
  if (!accessService.can(access, PERMISSIONS.SETTINGS_MANAGE)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const url = new URL(request.url);
  const requestId = url.searchParams.get('requestId')?.trim() || null;
  const emailParam = url.searchParams.get('email')?.trim() || null;
  const siteId = await adminSiteId();

  let email = emailParam;
  let visitorId: string | null = null;
  if (requestId) {
    const reqRow = await privacyService.getRequest(siteId, requestId);
    if (!reqRow) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }
    email = reqRow.email;
    visitorId = reqRow.visitorId ?? null;
  }

  if (!email) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 });
  }

  const { buffer, filename } = await privacyService.buildExportZip({
    siteId,
    email,
    visitorId,
    actorId: session.user.id,
    requestId,
  });

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}
