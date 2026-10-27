import 'server-only';
import { and, eq } from 'drizzle-orm';
import { db } from '@/db';
import { editorLocks, users } from '@/db/schema';
import { accessService } from '@/server/services/access.service';
import { adminSiteId } from '@/server/services/site-context';

const LOCK_STALE_MS = 2 * 60 * 1000; // fresh for 2 minutes after last_seen_at

export type EditorLock = {
  id: string;
  targetType: 'page' | 'post';
  targetId: string;
  userId: string;
  userName: string | null;
  lastSeenAt: Date;
  isStale: boolean;
};

export type LockStatus =
  | { kind: 'free' }
  | { kind: 'locked'; lock: EditorLock; isCurrentUser: boolean };

/** Returns the lock status for a target. Requires pages.edit on the active site. */
export const editorLockService = {
  async getLock(
    targetType: 'page' | 'post',
    targetId: string,
    userId: string
  ): Promise<LockStatus | null> {
    const siteId = await adminSiteId();
    await accessService.assertPermission(userId, 'pages.edit');

    const [lock] = await db
      .select({
        id: editorLocks.id,
        targetType: editorLocks.targetType,
        targetId: editorLocks.targetId,
        userId: editorLocks.userId,
        lastSeenAt: editorLocks.lastSeenAt,
      })
      .from(editorLocks)
      .where(
        and(
          eq(editorLocks.targetType, targetType),
          eq(editorLocks.targetId, targetId)
        )
      )
      .limit(1);

    if (!lock) return null;

    const [lockUser] = await db
      .select({ name: users.name })
      .from(users)
      .where(eq(users.id, lock.userId))
      .limit(1);

    const isStale =
      Date.now() - new Date(lock.lastSeenAt).getTime() > LOCK_STALE_MS;

    return {
      kind: 'locked',
      lock: {
        ...lock,
        targetType: lock.targetType as 'page' | 'post',
        userName: lockUser?.name ?? null,
        isStale,
      },
      isCurrentUser: lock.userId === userId,
    };
  },

  /** Heartbeat: refresh last_seen_at. Requires pages.edit on the active site. */
  async heartbeat(
    targetType: 'page' | 'post',
    targetId: string,
    userId: string
  ): Promise<{ ok: boolean; error?: string }> {
    await accessService.assertPermission(userId, 'pages.edit');

    const [existing] = await db
      .select({ id: editorLocks.id })
      .from(editorLocks)
      .where(
        and(
          eq(editorLocks.targetType, targetType),
          eq(editorLocks.targetId, targetId)
        )
      )
      .limit(1);

    const now = new Date();
    if (existing) {
      await db
        .update(editorLocks)
        .set({ userId, lastSeenAt: now })
        .where(eq(editorLocks.id, existing.id));
    } else {
      await db.insert(editorLocks).values({
        id: `${targetType}:${targetId}`,
        siteId: await adminSiteId(),
        targetType,
        targetId,
        userId,
        lastSeenAt: now,
      });
    }

    return { ok: true };
  },

  /** Take over a stale lock. Requires pages.edit. */
  async takeOver(
    targetType: 'page' | 'post',
    targetId: string,
    userId: string
  ): Promise<{ ok: boolean; error?: string }> {
    await accessService.assertPermission(userId, 'pages.edit');

    const lock = await this.getLock(targetType, targetId, userId);
    if (!lock || lock.kind !== 'locked') return { ok: true };
    if (lock.isCurrentUser) return { ok: true };
    if (!lock.lock.isStale) {
      return { ok: false, error: 'lock_not_stale' };
    }

    const now = new Date();
    await db
      .update(editorLocks)
      .set({ userId, lastSeenAt: now })
      .where(
        and(
          eq(editorLocks.targetType, targetType),
          eq(editorLocks.targetId, targetId)
        )
      );

    return { ok: true };
  },

  /** Release a lock held by the current user. */
  async release(
    targetType: 'page' | 'post',
    targetId: string,
    userId: string
  ): Promise<void> {
    await db
      .delete(editorLocks)
      .where(
        and(
          eq(editorLocks.targetType, targetType),
          eq(editorLocks.targetId, targetId),
          eq(editorLocks.userId, userId)
        )
      );
  },
};
