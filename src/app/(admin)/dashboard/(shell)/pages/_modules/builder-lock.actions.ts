'use server';

import { editorLockService } from '@/server/services/editor-lock.service';
import { getCurrentUserAndTeamId } from '@/lib/auth';

/** Returns the lock status for a page or post target. */
export async function getEditorLock(
  targetType: 'page' | 'post',
  targetId: string
): Promise<{ ok: boolean; lock?: { userName: string | null; isStale: boolean; isCurrentUser: boolean }; error?: string }> {
  const { userId } = await getCurrentUserAndTeamId();
  if (!userId) return { ok: false, error: 'unauthenticated' };

  const lock = await editorLockService.getLock(targetType, targetId, userId);
  if (!lock) return { ok: true };

  if (lock.kind === 'locked') {
    return {
      ok: true,
      lock: {
        userName: lock.lock.userName,
        isStale: lock.lock.isStale,
        isCurrentUser: lock.isCurrentUser,
      },
    };
  }

  return { ok: true };
}

/** Refreshes the lock heartbeat. */
export async function heartbeatEditorLock(
  targetType: 'page' | 'post',
  targetId: string
): Promise<{ ok: boolean; error?: string }> {
  const { userId } = await getCurrentUserAndTeamId();
  if (!userId) return { ok: false, error: 'unauthenticated' };

  return editorLockService.heartbeat(targetType, targetId, userId);
}

/** Takes over a stale lock. */
export async function takeOverEditorLock(
  targetType: 'page' | 'post',
  targetId: string
): Promise<{ ok: boolean; error?: string }> {
  const { userId } = await getCurrentUserAndTeamId();
  if (!userId) return { ok: false, error: 'unauthenticated' };

  return editorLockService.takeOver(targetType, targetId, userId);
}

/** Releases a lock held by the current user. */
export async function releaseEditorLock(
  targetType: 'page' | 'post',
  targetId: string
): Promise<void> {
  const { userId } = await getCurrentUserAndTeamId();
  if (!userId) return;

  await editorLockService.release(targetType, targetId, userId);
}
