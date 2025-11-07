'use server';

import { redirect, RedirectType } from 'next/navigation';
import { cache } from 'react';

import { PAGES } from '@/config/pages';
import { getSessionId, validateSession as validateSessionFromSession } from '@/lib/auth/session';
import type { User } from '@/db/schema';

const cachedRequest = cache(async () => {
  try {
    const sessionId = await getSessionId();

    if (!sessionId) {
      return null;
    }

    return await validateSessionFromSession(sessionId);
  } catch (error) {
    console.error('Error validating session:', error);
    return null;
  }
});

export async function validateSession() {
  const result = await cachedRequest();
  return result;
}

export type ValidateSession = ReturnType<typeof validateSession>;

export const getCurrentUser = cache(async (): Promise<User> => {
  const session = await validateSession();

  if (!session) {
    redirect(PAGES.AUTH.LOGIN, RedirectType.replace);
  }

  return session.user as User;
});

export const getCurrentUserAndTeamId = cache(async () => {
  const session = await validateSession();

  if (!session) {
    redirect(PAGES.AUTH.LOGIN, RedirectType.replace);
  }

  return {
    userId: session.user.id,
  };
});
