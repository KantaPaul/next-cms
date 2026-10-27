/**
 * clampProgress — clamp a progress position to [0, duration] and determine
 * completion. Completion is reached when position >= duration (or duration is
 * unknown and position > 0 is treated as not complete until duration is set).
 */
export type ClampedProgress = {
  position: number;
  duration: number | null;
  completed: boolean;
  /** Fraction of duration watched, 0-1. null when duration is unknown. */
  progress: number | null;
};

/** Threshold (as a fraction of duration) at which a video is considered complete. */
const COMPLETION_THRESHOLD = 0.95;

/**
 * Clamp a raw position against duration and compute completion.
 *
 * @param position - Current playback position in seconds.
 * @param duration - Total duration in seconds, or null when unknown.
 * @param maxPosition - Optional upper bound (defaults to duration when set).
 */
export function clampProgress(
  position: number,
  duration: number | null,
  maxPosition?: number
): ClampedProgress {
  const clamped = Math.max(0, Math.min(position, maxPosition ?? duration ?? position));
  const resolvedDuration = duration ?? null;
  const progress =
    resolvedDuration && resolvedDuration > 0 ? clamped / resolvedDuration : null;
  const completed =
    resolvedDuration && resolvedDuration > 0 && progress !== null
      ? progress >= COMPLETION_THRESHOLD
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
