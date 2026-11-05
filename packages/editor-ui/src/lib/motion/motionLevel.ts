/**
 * How much editor chrome animates. `full` plays everything; `subtle` keeps
 * functional transitions (indicators, collapses, reorders) and drops
 * decorative ones (sweep, shimmer, bounce); `off` makes everything instant.
 * The OS reduced-motion setting always wins over `full` and `subtle`.
 */
export type MotionLevel = 'full' | 'subtle' | 'off';

export const MOTION_LEVELS: readonly MotionLevel[] = ['full', 'subtle', 'off'];

/** Picks the level from stored prefs, honouring the older boolean flag. */
export function resolveMotionLevel(prefs?: {
  motion?: unknown;
  reducedMotion?: unknown;
} | null): MotionLevel {
  if (prefs?.reducedMotion === true) return 'off';
  const level = prefs?.motion;
  return MOTION_LEVELS.includes(level as MotionLevel)
    ? (level as MotionLevel)
    : 'full';
}
