/** Pure number helpers for the controls (E12), kept DOM-free for tests. */

export const clamp = (value: number, min: number, max: number): number => {
  let low = min;
  let high = max;
  if (low > high) {
    const tmp = low;
    low = high;
    high = tmp;
  }
  const numeric = Number.isFinite(value) ? value : low;
  return Math.min(high, Math.max(low, numeric));
};

/** Rounds away float noise such as 0.30000000000000004. */
export const roundTo = (value: number, digits = 2): number => {
  if (!Number.isFinite(value)) return 0;
  return Number(value.toFixed(digits));
};

export interface ScrubModifiers {
  shiftKey?: boolean;
  altKey?: boolean;
}

/** Shift is 10x faster, Alt is 10x slower. */
export const scrubMultiplier = ({
  shiftKey,
  altKey,
}: ScrubModifiers = {}): number => (shiftKey ? 10 : altKey ? 0.1 : 1);

/** One step for every 2 px dragged, scaled by the modifier keys. */
export const scrubValue = (
  start: number,
  deltaX: number,
  step: number,
  modifiers: ScrubModifiers = {}
): number =>
  roundTo(start + Math.round(deltaX * 0.5) * step * scrubMultiplier(modifiers));

/** Where a value sits along a min..max track, as 0–100. */
export const tickPercent = (value: number, min: number, max: number): number => {
  if (max <= min) return 0;
  if (!Number.isFinite(value)) return 0;
  return clamp(((value - min) / (max - min)) * 100, 0, 100);
};
