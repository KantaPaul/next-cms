'use client';

import { useEffect, useRef } from 'react';

type Props = {
  path: string;
  pageId?: string;
  postId?: string;
};

export function ViewBeacon({ pageId, postId, path }: Props) {
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current || !path || (!pageId && !postId) || (pageId && postId)) {
      return;
    }
    sent.current = true;

    const payload = JSON.stringify({
      pageId: pageId || undefined,
      postId: postId || undefined,
      path,
      referrer:
        typeof document !== 'undefined' ? document.referrer || null : null,
    });

    // Prefer sendBeacon so the request survives navigation; fall back to fetch.
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      const blob = new Blob([payload], { type: 'application/json' });
      navigator.sendBeacon('/api/analytics/view', blob);
      return;
    }

    void fetch('/api/analytics/view', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      keepalive: true,
    }).catch(() => {
      // Ignore network errors — analytics must never break the page.
    });
  }, [pageId, postId, path]);

  return null;
}
