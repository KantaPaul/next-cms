'use server';

import { randomBytes } from 'crypto';
import { and, desc, eq, getTableColumns, gt, lt } from 'drizzle-orm';
import { cookies, headers } from 'next/headers';
import { db } from '@/db';
import { sessions, users } from '@/db/schema';

export interface Session {
  id: string;
  userId: string;
  expiresAt: Date;
  userIp?: string;
  userAgent?: string;
}

const sessionExpiresInSeconds = 60 * 60 * 24 * 30; // 30 days

// Pre-compiled regex for better performance
const base64ToBase64UrlRegex = /[+/=]/g;

function generateSessionId(): string {
  // Generate 32 random bytes for high entropy
  const bytes = randomBytes(32);

  // Convert to base64 and make URL-safe in one operation
  // This is more performant than multiple string replacements
  return bytes.toString('base64').replace(base64ToBase64UrlRegex, match => {
    switch (match) {
      case '+':
        return '-';
      case '/':
        return '_';
      case '=':
        return '';
      default:
        return match;
    }
  });
}

async function getClientInfo() {
  try {
    const headersList = await headers();
    const userAgent = headersList.get('user-agent') || '';
    const forwardedFor = headersList.get('x-forwarded-for');
    const realIp = headersList.get('x-real-ip');
    const userIp = forwardedFor?.split(',')[0] || realIp || 'unknown';

    return { userIp, userAgent };
  } catch (error) {
    return { userIp: 'unknown', userAgent: 'unknown' };
  }
}

export async function createSession(userId: string): Promise<Session> {
  const now = new Date();
  const sessionId = generateSessionId();
  const expiresAt = new Date(now.getTime() + 1000 * sessionExpiresInSeconds);
  const { userIp, userAgent } = await getClientInfo();

  await db.insert(sessions).values({
    id: sessionId,
    userId,
    expiresAt,
    userIp,
    userAgent,
  });

  return {
    id: sessionId,
    userId,
    expiresAt,
    userIp,
    userAgent,
  };
}

export async function validateSession(sessionId: string) {
  try {
    // Validate sessionId format to prevent injection
    if (!sessionId || typeof sessionId !== 'string' || sessionId.length === 0) {
      return null;
    }

    // Sanitize session ID - only allow base64url characters
    const isValidSessionId = /^[A-Za-z0-9_-]+$/.test(sessionId);

    if (!isValidSessionId) {
      console.warn('Invalid session ID format:', sessionId);
      return null;
    }

    const now = new Date();

    // Use a more efficient query with specific column selection
    const [result] = await db
      .select({
        session: {
          id: sessions.id,
          userId: sessions.userId,
          expiresAt: sessions.expiresAt,
        },
        user: getTableColumns(users),
      })
      .from(sessions)
      .innerJoin(users, eq(sessions.userId, users.id))
      .where(eq(sessions.id, sessionId))
      .limit(1);

    if (!result) {
      return null;
    }

    const session: Session = {
      id: result.session.id,
      userId: result.session.userId,
      expiresAt: result.session.expiresAt,
    };

    // Check if session is expired
    if (now.getTime() >= session.expiresAt.getTime()) {
      // Use a non-blocking cleanup to avoid blocking the response
      invalidateSession(session.id).catch(console.error);
      return null;
    }

    // Refresh session if it's close to expiring (more than half way through)
    const halfLife = (1000 * sessionExpiresInSeconds) / 2;

    if (now.getTime() >= session.expiresAt.getTime() - halfLife) {
      session.expiresAt = new Date(Date.now() + 1000 * sessionExpiresInSeconds);
      // Use a non-blocking update to avoid blocking the response
      db.update(sessions)
        .set({ expiresAt: session.expiresAt })
        .where(eq(sessions.id, session.id))
        .catch(console.error);
    }

    return {
      session,
      user: result.user,
    };
  } catch (error) {
    console.error('Session validation error:', error);
    // Return null for invalid or corrupted sessions
    return null;
  }
}

export async function invalidateSession(sessionId: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.id, sessionId));
}

export async function invalidateAllSessions(userId: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.userId, userId));
}

export async function invalidateSessionById(
  sessionId: string,
  userId: string
): Promise<boolean> {
  const result = await db
    .delete(sessions)
    .where(and(eq(sessions.id, sessionId), eq(sessions.userId, userId)))
    .returning();

  return result.length > 0;
}

export async function cleanupExpiredSessions(): Promise<void> {
  const now = new Date();
  await db.delete(sessions).where(lt(sessions.expiresAt, now));
}

export async function getUserSessions(userId: string) {
  const now = new Date();

  const userSessions = await db
    .select({
      id: sessions.id,
      userId: sessions.userId,
      expiresAt: sessions.expiresAt,
      userIp: sessions.userIp,
      userAgent: sessions.userAgent,
      createdAt: sessions.createdAt,
    })
    .from(sessions)
    .where(and(eq(sessions.userId, userId), gt(sessions.expiresAt, now)))
    .orderBy(desc(sessions.createdAt));

  return userSessions;
}

// Cookie management
export async function setSessionCookie(
  sessionId: string,
  expiresAt: Date
): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.set('session', sessionId, {
    httpOnly: true,
    sameSite: 'lax',
    expires: expiresAt,
    path: '/',
    secure: process.env.NODE_ENV === 'production',
  });
}

export async function deleteSessionCookie(): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.set('session', '', {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
    secure: process.env.NODE_ENV === 'production',
  });
}

export async function getSessionId(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get('session')?.value ?? null;
}
