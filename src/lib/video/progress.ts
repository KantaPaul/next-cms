/**
 * clampProgress — clamp a progress position to the video bounds and determine
 * completion.
 *
 * - Position is clamped to `0..duration` when the duration is known, otherwise to
 *   a 24 hour ceiling (a viewer can always keep watching; we just stop tracking).
 * - `completed` is only true when the duration is known and the watched position
 *   reaches the configured completion percent (default 90%).
 * - A client-supplied `completed` flag is never trusted.
 */

export type ClampedProgress = {
  position: number;
  duration: number | null;
  completed: boolean;
  /** Fraction of duration watched, 0-1. null when duration is unknown. */
  progress: number | null;
};

/** Default ceiling used when the duration is unknown. */
export const DEFAULT_MAX_POSITION_SECONDS = 24 * 60 * 60;

/** Default fraction of the video watched that counts as complete. */
export const DEFAULT_COMPLETION_PERCENT = 0.9;

export type ClampProgressOptions = {
  /** Fraction of the duration watched that counts as complete (0-1). Default 0.9. */
  completionPercent?: number;
};

export function clampProgress(
  position: number,
  duration: number | null,
  maxPosition?: number,
  options?: ClampProgressOptions
): ClampedProgress {
  const percent = options?.completionPercent ?? DEFAULT_COMPLETION_PERCENT;
  const ceiling = maxPosition ?? duration ?? DEFAULT_MAX_POSITION_SECONDS;
  const clamped = Math.max(0, Math.min(position, ceiling));
  const resolvedDuration = duration ?? null;
  const progress =
    resolvedDuration && resolvedDuration > 0 ? clamped / resolvedDuration : null;
  const completed =
    resolvedDuration && resolvedDuration > 0 && progress !== null
      ? progress >= percent
      : false;

  return { position: clamped, duration: resolvedDuration, completed, progress };
}

/** Default zero progress. */
export const EMPTY_PROGRESS: ClampedProgress = {
  position: 0,
  duration: null,
  completed: false,
  progress: null,
};
