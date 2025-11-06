'use server';

import { redirect } from 'next/navigation';
import { AuthService } from "@/server/services/auth.services";
import { validateSession } from '@/lib/auth/session.validation';
import { db } from "@/db";
import { users } from "@/db/schema";
import { type User } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  createSession,
  deleteSessionCookie,
  getSessionId,
  getUserSessions,
  invalidateAllSessions,
  invalidateSession,
  invalidateSessionById,
  setSessionCookie,
  validateSession as validateSessionFromSession,
  type Session,
} from "@/lib/auth/session";

export async function validateRequest() {
  return validateSession();
}

export type ValidateRequest = ReturnType<typeof validateRequest>;

export async function authenticateUser() {
  const session = await validateRequest();

  if (!session) {
    redirect('/login');
  }

  return session.user;
}

export async function signOut() {
  return AuthService.signOut();
}


export async function getSession(): Promise<{ session: Session; user: User } | null> {
  const sessionId = await getSessionId();

  if (!sessionId) {
    return null;
  }

  const result = await validateSessionFromSession(sessionId);

  if (!result) {
    return null;
  }

  return {
    session: result.session,
    user: result.user as User,
  };
}

export async function requireSession(): Promise<{ session: Session; user: User }> {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  return session;
}

export async function login(userId: string): Promise<void> {
  const session = await createSession(userId);
  await setSessionCookie(session.id, session.expiresAt);
}

export async function logout(): Promise<void> {
  const sessionId = await getSessionId();

  if (sessionId) {
    await invalidateSession(sessionId);
  }

  await deleteSessionCookie();
}

export async function logoutAllSessions(userId: string): Promise<void> {
  await invalidateAllSessions(userId);
  deleteSessionCookie();
}

export async function getUserById(userId: string): Promise<User | null> {
  const result = await db.select().from(users).where(eq(users.id, userId)).limit(1);

  if (result.length === 0) {
    return null;
  }

  return result[0] as User;
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);

  if (result.length === 0) {
    return null;
  }

  return result[0] as User;
}

export async function getUserByGoogleId(googleId: string): Promise<User | null> {
  const result = await db.select().from(users).where(eq(users.googleId, googleId)).limit(1);

  if (result.length === 0) {
    return null;
  }

  return result[0] as User;
}

export async function getUserSessionsForUser(userId: string) {
  return await getUserSessions(userId);
}

export async function invalidateUserSession(sessionId: string, userId: string): Promise<boolean> {
  return await invalidateSessionById(sessionId, userId);
}
