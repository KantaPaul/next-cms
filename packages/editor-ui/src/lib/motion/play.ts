import { motionAllowed } from './useFlip';

export type DurationToken = 'fast' | 'normal' | 'slow';

/** Parses a CSS time ("200ms", "0.2s") to milliseconds; 0 when unset. */
export function parseCssTime(value: string): number {
  const v = value.trim();
  if (!v) return 0;
  const n = Number.parseFloat(v);
  if (!Number.isFinite(n)) return 0;
  return v.endsWith('ms') ? n : v.endsWith('s') ? n * 1000 : n;
}

/**
 * Plays a one-off Web Animation on `el`, timed by an `--ne-duration-*`
 * token so reduced motion (tokens become 0ms) and the motion level apply.
 * Decorative effects are also skipped in `subtle`. Returns the animation,
 * or null when nothing played.
 */
export function playMotion(
  el: Element | null | undefined,
  keyframes: Keyframe[],
  {
    duration = 'normal',
    easing = 'var(--ne-ease-out)',
    decorative = false,
  }: {
    duration?: DurationToken;
    easing?: string;
    decorative?: boolean;
  } = {}
): Animation | null {
  if (!el || typeof (el as HTMLElement).animate !== 'function') return null;
  if (!motionAllowed(el)) return null;
  if (decorative && el.closest('[data-ne-motion="subtle"]')) return null;
  const styles = getComputedStyle(el);
  const ms = parseCssTime(styles.getPropertyValue(`--ne-duration-${duration}`));
  if (ms <= 0) return null;
  // WAAPI can't resolve var() in easing, so read the token's value.
  const resolvedEasing = easing.startsWith('var(')
    ? styles.getPropertyValue(easing.slice(4, -1).trim()).trim() || 'ease-out'
    : easing;
  return (el as HTMLElement).animate(keyframes, {
    duration: ms,
    easing: resolvedEasing,
  });
}

/** Ready-made keyframes for the top bar and inspector. */
export const MOTION = {
  nudgeLeft: [
    { transform: 'rotate(0deg)' },
    { transform: 'rotate(-20deg)' },
    { transform: 'rotate(0deg)' },
  ],
  nudgeRight: [
    { transform: 'rotate(0deg)' },
    { transform: 'rotate(20deg)' },
    { transform: 'rotate(0deg)' },
  ],
  keyBounce: [
    { transform: 'translateY(0)' },
    { transform: 'translateY(1.5px) scale(0.92)' },
    { transform: 'translateY(0)' },
  ],
  pop: [
    { transform: 'scale(0.4)', opacity: 0 },
    { transform: 'scale(1.15)', opacity: 1, offset: 0.7 },
    { transform: 'scale(1)', opacity: 1 },
  ],
} satisfies Record<string, Keyframe[]>;

/**
 * Brief highlight that tells the user a value just changed (reset, undo,
 * preset). Reads the token colour because WAAPI keyframes can't use var().
 */
export function flashValue(el: Element | null | undefined) {
  if (!el) return null;
  const soft =
    getComputedStyle(el).getPropertyValue('--ne-primary-soft').trim() ||
    'rgba(79, 70, 229, 0.15)';
  return playMotion(
    el,
    [{ backgroundColor: soft }, { backgroundColor: 'transparent' }],
    { duration: 'slow' }
  );
}

/** Repeat delay and interval for press-and-hold steppers (zoom ±). */
export const HOLD_REPEAT = { delay: 350, interval: 90 } as const;
