'use client';

import { useEffect, useState } from 'react';
import { getAiStatus } from '@/app/(admin)/dashboard/(shell)/pages/_modules/ai.actions';

let cached: boolean | null = null;

/** Whether the server has GEMINI_API_KEY configured (cached for the session). */
export function useAiEnabled() {
  const [enabled, setEnabled] = useState<boolean | null>(cached);

  useEffect(() => {
    if (cached !== null) return;
    getAiStatus()
      .then(status => {
        cached = !!status?.enabled;
        setEnabled(cached);
      })
      .catch(() => setEnabled(false));
  }, []);

  return enabled;
}
