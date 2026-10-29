/**
 * Drop geometry for canvas drag and drop (R690). Pure, so it is tested without
 * a browser; the canvas feeds it measured rectangles.
 */

export type Rect = { left: number; top: number; width: number; height: number };
export type Point = { x: number; y: number };
/** `y` stacks children top to bottom; `x` places them side by side. */
export type Axis = 'x' | 'y';

/** Line thickness of the drop indicator, in pixels. */
export const DROP_LINE = 3;

/** Index to insert at: before the first child whose middle is past the pointer. */
export function dropIndex(children: Rect[], point: Point, axis: Axis): number {
  const index = children.findIndex(rect =>
    axis === 'y'
      ? point.y < rect.top + rect.height / 2
      : point.x < rect.left + rect.width / 2
  );
  return index === -1 ? children.length : index;
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
      ? { left: slot.left, top: slot.top + slot.height / 2, width: slot.width, height: DROP_LINE }
      : { left: slot.left + slot.width / 2, top: slot.top, width: DROP_LINE, height: slot.height };
  }
  const before = index < children.length;
  const rect = before ? children[index] : children[children.length - 1];
  if (axis === 'y') {
    const top = before ? rect.top : rect.top + rect.height;
    return { left: rect.left, top: top - DROP_LINE / 2, width: rect.width, height: DROP_LINE };
  }
  const left = before ? rect.left : rect.left + rect.width;
  return { left: left - DROP_LINE / 2, top: rect.top, width: DROP_LINE, height: rect.height };
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
  if (y > height - edge) return Math.ceil((Math.min(y, height) - (height - edge)) / 3);
  return 0;
}
