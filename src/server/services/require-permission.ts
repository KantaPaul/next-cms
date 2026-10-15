import 'server-only';
import type { PermissionKey } from '@/config/permissions';
import { getCurrentUserAndTeamId } from '@/lib/auth';
import { accessService } from '@/server/services/access.service';

/** Resolves the signed-in user's access for a dashboard page and whether they hold `key`. */
export async function requirePermission(key: PermissionKey) {
  const { userId } = await getCurrentUserAndTeamId();
  const access = await accessService.getUserAccess(userId);
  return { userId, access, allowed: accessService.can(access, key) };
}
