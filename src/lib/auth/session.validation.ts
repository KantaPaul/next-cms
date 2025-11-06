'use server';

import { cache } from 'react';
import {
  getSessionId,
  validateSession as validateSessionFromSession,
} from "@/lib/auth/session";

const cachedRequest = cache(async () => {
  const sessionId = await getSessionId();

  if (!sessionId) {
    return null;
  }

  return await validateSessionFromSession(sessionId);
});

export async function validateSession() {
  const result = await cachedRequest();

  return result;
}

export type ValidateSession = ReturnType<typeof validateSession>;
