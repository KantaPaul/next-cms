import { NextResponse } from 'next/server';
import { PERMISSIONS } from '@/config/permissions';
import { validateSession } from '@/lib/auth';
import { accessService, type UserAccess } from '@/server/services/access.service';
import { adminSiteId } from '@/server/services/site-context';

export async function requireBackupAdmin(): Promise<
  | { ok: true; access: UserAccess; siteId: string }
  | { ok: false; response: NextResponse }
> {
  const session = await validateSession();
  if (!session?.user?.id) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }
  const access = await accessService.getUserAccess(session.user.id);
  if (!accessService.can(access, PERMISSIONS.SETTINGS_MANAGE)) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    };
  }
  const siteId = await adminSiteId();
  return { ok: true, access, siteId };
}
