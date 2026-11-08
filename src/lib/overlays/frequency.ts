import type { OverlayFrequency, OverlayStorageState } from './types';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Pure evaluator for overlay frequency caps.
 *
 * @param frequency The configured frequency settings.
 * @param state The client storage state for this overlay (or null/undefined if never seen).
 * @param now Current timestamp in ms (defaults to Date.now()).
 * @returns true if the overlay should be presented, false if capped.
 */
export function shouldShow(
  frequency: OverlayFrequency,
  state?: OverlayStorageState | null,
  now = Date.now()
): boolean {
  if (!state) return true;

  // Conversion cap
  if (frequency.stopAfterConversion && state.converted) {
    return false;
  }

  switch (frequency.mode) {
    case 'every-page':
      return true;

    case 'once-session':
      return !state.sessionViewed;

    case 'once-per-days': {
      if (!state.lastViewedAt) return true;
      const days = frequency.days ?? 1;
      const elapsedMs = now - state.lastViewedAt;
      return elapsedMs >= days * MS_PER_DAY;
    }

    case 'once-ever':
      return (state.viewCount ?? 0) === 0;

    default:
      return true;
  }
}

/** Storage key includes publishedAt so republishing cleanly resets the frequency cap. */
export function getOverlayStorageKey(
  overlayId: string,
  publishedAt?: string | number | null
): string {
  const stamp = publishedAt ? new Date(publishedAt).getTime() : 'draft';
  return `overlay:${overlayId}:${stamp}`;
}

/** The once-per-session flag lives in sessionStorage so it really ends with the tab session. */
function sessionKey(key: string): string {
  return `${key}:session`;
}

export function readOverlayStorage(
  overlayId: string,
  publishedAt?: string | number | null
): OverlayStorageState | null {
  if (typeof window === 'undefined') return null;
  const key = getOverlayStorageKey(overlayId, publishedAt);
  let state: OverlayStorageState | null = null;

  try {
    const raw = window.localStorage.getItem(key);
    if (raw) state = JSON.parse(raw) as OverlayStorageState;
  } catch {
    state = null;
  }

  let sessionViewed = false;

  try {
    sessionViewed = window.sessionStorage.getItem(sessionKey(key)) === '1';
  } catch {
    sessionViewed = false;
  }

  if (!state && !sessionViewed) return null;
  return { ...(state ?? { viewCount: 0 }), sessionViewed };
}

export function writeOverlayStorage(
  overlayId: string,
  publishedAt: string | number | null | undefined,
  patch: Partial<OverlayStorageState>
): void {
  if (typeof window === 'undefined') return;
  const key = getOverlayStorageKey(overlayId, publishedAt);
  const { sessionViewed, ...persistent } = patch;

  if (sessionViewed !== undefined) {
    try {
      if (sessionViewed) window.sessionStorage.setItem(sessionKey(key), '1');
      else window.sessionStorage.removeItem(sessionKey(key));
    } catch {
      // Storage blocked (private mode, disabled cookies): skip the cap.
    }
  }

  if (Object.keys(persistent).length === 0) return;

  try {
    const current = readOverlayStorage(overlayId, publishedAt) ?? {
      viewCount: 0,
    };
    const { sessionViewed: _drop, ...rest } = current;
    window.localStorage.setItem(key, JSON.stringify({ ...rest, ...persistent }));
  } catch {
    // Ignore storage quota or access errors
  }
}
