import 'server-only';
import { createHash } from 'crypto';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { authAttempts, users } from '@/db/schema';
import { siteSettingsService } from '@/server/services/site-settings.service';

export function hashIdentifier(id: string): string {
  return createHash('sha256').update(id.trim().toLowerCase()).digest('hex');
}

export const authRateLimitService = {
  checkLockout: async (
    identifier: string,
    email?: string
  ): Promise<{ locked: boolean; lockedUntil?: Date }> => {
    const now = new Date();
    const key = hashIdentifier(identifier);

    // 1. Check attempt record by hashed identifier
    const [attempt] = await db
      .select({ lockedUntil: authAttempts.lockedUntil })
      .from(authAttempts)
      .where(eq(authAttempts.key, key))
      .limit(1);

    if (attempt?.lockedUntil && attempt.lockedUntil > now) {
      return { locked: true, lockedUntil: attempt.lockedUntil };
    }

    // 2. Check user record if email is provided
    if (email) {
      const [user] = await db
        .select({ lockedUntil: users.lockedUntil })
        .from(users)
        .where(eq(users.email, email.trim().toLowerCase()))
        .limit(1);

      if (user?.lockedUntil && user.lockedUntil > now) {
        return { locked: true, lockedUntil: user.lockedUntil };
      }
    }

    return { locked: false };
  },

  recordFailedLogin: async (
    identifier: string,
    email?: string
  ): Promise<{ locked: boolean; lockedUntil?: Date }> => {
    const now = new Date();
    const key = hashIdentifier(identifier);
    const settings = await siteSettingsService.getAuthSettings();
    const maxAttempts = settings.maxFailedAttempts || 5;
    const lockoutMs = (settings.lockoutMinutes || 15) * 60 * 1000;

    // Fetch existing attempt
    const [existingAttempt] = await db
      .select()
      .from(authAttempts)
      .where(eq(authAttempts.key, key))
      .limit(1);

    const nextCount = (existingAttempt?.count ?? 0) + 1;
    let lockedUntil: Date | null = null;

    if (nextCount >= maxAttempts) {
      lockedUntil = new Date(now.getTime() + lockoutMs);
    }

    await db
      .insert(authAttempts)
      .values({
        id: key,
        key,
        count: nextCount,
        lockedUntil,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: authAttempts.key,
        set: {
          count: nextCount,
          lockedUntil,
          updatedAt: now,
        },
      });

    if (email) {
      const normalizedEmail = email.trim().toLowerCase();
      const [user] = await db
        .select({ failedLoginCount: users.failedLoginCount })
        .from(users)
        .where(eq(users.email, normalizedEmail))
        .limit(1);

      if (user) {
        const userFailCount = (user.failedLoginCount ?? 0) + 1;
        const userLocked =
          userFailCount >= maxAttempts
            ? new Date(now.getTime() + lockoutMs)
            : null;

        await db
          .update(users)
          .set({
            failedLoginCount: userFailCount,
            lockedUntil: userLocked,
          })
          .where(eq(users.email, normalizedEmail));

        if (userLocked) {
          lockedUntil = userLocked;
        }
      }
    }

    return {
      locked: lockedUntil !== null && lockedUntil > now,
      lockedUntil: lockedUntil ?? undefined,
    };
  },

  clearFailedLogins: async (
    identifier: string,
    email?: string
  ): Promise<void> => {
    const key = hashIdentifier(identifier);

    await db
      .delete(authAttempts)
      .where(eq(authAttempts.key, key))
      .catch(() => {});

    if (email) {
      const normalizedEmail = email.trim().toLowerCase();
      await db
        .update(users)
        .set({
          failedLoginCount: 0,
          lockedUntil: null,
        })
        .where(eq(users.email, normalizedEmail))
        .catch(() => {});
    }
  },
};
