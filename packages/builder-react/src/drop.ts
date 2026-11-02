/**
 * Drop geometry for canvas drag and drop (R690). Pure, so it is tested without
 * a browser; the canvas feeds it measured rectangles.
 */

export type Rect = { left: number; top: number; width: number; height: number };
export type Point = { x: number; y: number };
/** `y` stacks children top to bottom; `x` places them side by side. */
export type Axis = 'x' | 'y';

/** Line thickness of the drop indicator, in pixels. */
export const DROP_LINE = 4;

/**
 * Drop index with hysteresis to prevent flickering near child midpoints.
 * Keeps the previous index while the pointer is within `hysteresis` px of the midpoint.
 */
export function dropIndexWithHysteresis(
  children: Rect[],
  point: Point,
  axis: Axis,
  previousIndex?: number | null,
  hysteresis = 12
): number {
  const p = axis === 'y' ? point.y : point.x;
  for (let j = 0; j < children.length; j++) {
    const rect = children[j];
    const mid =
      axis === 'y' ? rect.top + rect.height / 2 : rect.left + rect.width / 2;
    let threshold = mid;
    let inclusive = false;
    if (previousIndex === j) {
      threshold = mid + hysteresis;
      inclusive = true;
    } else if (previousIndex === j + 1) {
      threshold = mid - hysteresis;
      inclusive = false;
    }
    if (inclusive ? p <= threshold : p < threshold) {
      return j;
    }
  }
  return children.length;
}

/** Index to insert at: before the first child whose middle is past the pointer. */
export function dropIndex(
  children: Rect[],
  point: Point,
  axis: Axis,
  previousIndex?: number | null,
  hysteresis = 12
): number {
  if (previousIndex !== undefined && previousIndex !== null) {
    return dropIndexWithHysteresis(children, point, axis, previousIndex, hysteresis);
  }
  const index = children.findIndex(rect =>
    axis === 'y'
      ? point.y < rect.top + rect.height / 2
      : point.x < rect.left + rect.width / 2
  );
  return index === -1 ? children.length : index;
}

/**
 * Computes toolbar x position, flipping to the block's right edge when near the
 * right viewport boundary, and clamping to visible bounds.
 */
export function toolbarX({
  left,
  width,
  anchorRight,
  bounds,
}: {
  left: number;
  width: number;
  anchorRight?: number;
  bounds?: { left: number; right: number; top?: number };
}): number {
  if (!bounds) return left;
  const rightEdge = anchorRight ?? left + width;
  const initial =
    left + width <= bounds.right - 8
      ? left
      : Math.max(bounds.left + 8, rightEdge - width);
  return Math.max(bounds.left + 8, Math.min(initial, bounds.right - 8 - width));
}

/** Where to draw the drop line for an insert at `index`. */
export function dropLine(
  children: Rect[],
  index: number,
  axis: Axis,
  slot: Rect
): Rect {
  if (children.length === 0) {
    return axis === 'y'
      ? {
          left: slot.left,
          top: slot.top + slot.height / 2,
          width: slot.width,
          height: DROP_LINE,
        }
      : {
          left: slot.left + slot.width / 2,
          top: slot.top,
          width: DROP_LINE,
          height: slot.height,
        };
  }
  const before = index < children.length;
  const rect = before ? children[index] : children[children.length - 1];
  if (axis === 'y') {
    const top = before ? rect.top : rect.top + rect.height;
    return {
      left: rect.left,
      top: top - DROP_LINE / 2,
      width: rect.width,
      height: DROP_LINE,
    };
  }
  const left = before ? rect.left : rect.left + rect.width;
  return {
    left: left - DROP_LINE / 2,
    top: rect.top,
    width: DROP_LINE,
    height: rect.height,
  };
}

/** Smallest rectangle around all rects; null when there are none. */
export function unionRect(rects: Rect[]): Rect | null {
  const visible = rects.filter(rect => rect.width > 0 || rect.height > 0);
  if (visible.length === 0) return null;
  const left = Math.min(...visible.map(rect => rect.left));
  const top = Math.min(...visible.map(rect => rect.top));
  const right = Math.max(...visible.map(rect => rect.left + rect.width));
  const bottom = Math.max(...visible.map(rect => rect.top + rect.height));
  return { left, top, width: right - left, height: bottom - top };
}

/** Scroll speed while dragging near the top or bottom edge, in pixels per frame. */
export function autoScrollSpeed(y: number, height: number, edge = 48): number {
  if (y < edge) return -Math.ceil((edge - Math.max(y, 0)) / 3);
  if (y > height - edge)
    return Math.ceil((Math.min(y, height) - (height - edge)) / 3);
  return 0;
}

/** True when two rectangles overlap at all (used by the marquee selection, R719). */
export function rectsIntersect(a: Rect, b: Rect): boolean {
  return (
    a.left < b.left + b.width &&
    a.left + a.width > b.left &&
    a.top < b.top + b.height &&
    a.top + a.height > b.top
  );
}

/** Normalizes two drag points into a rectangle, whichever direction the drag went. */
export function rectFromPoints(a: Point, b: Point): Rect {
  const left = Math.min(a.x, b.x);
  const top = Math.min(a.y, b.y);
  return { left, top, width: Math.abs(a.x - b.x), height: Math.abs(a.y - b.y) };
}
