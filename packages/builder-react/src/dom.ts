/**
 * Finding and measuring blocks and slots inside the canvas document. Blocks
 * are wrapped in `display: contents` elements, so their wrapper adds no box
 * and published layout is unchanged; a block's rectangle is its children's.
 */

import type { NodeId, SlotPosition, SlotRef } from '@nextcms/builder-core';
import {
  type Axis,
  dropIndex,
  dropLine,
  type Point,
  type Rect,
  unionRect,
} from './drop';

export const NODE_ATTR = 'data-builder-node';
export const SLOT_ATTR = 'data-builder-slot';
export const SLOT_PARENT_ATTR = 'data-slot-parent';
export const SLOT_NAME_ATTR = 'data-slot-name';

const toRect = (r: DOMRect): Rect => ({
  left: r.left,
  top: r.top,
  width: r.width,
  height: r.height,
});

/** The box a `display: contents` wrapper's content takes up. */
export function contentsRect(element: Element): Rect | null {
  return unionRect(
    Array.from(element.children, child => toRect(child.getBoundingClientRect()))
  );
}

export function nodeElement(doc: Document, id: NodeId): Element | null {
  return doc.querySelector(`[${NODE_ATTR}="${CSS.escape(id)}"]`);
}

export function nodeRect(doc: Document, id: NodeId): Rect | null {
  const element = nodeElement(doc, id);
  return element ? contentsRect(element) : null;
}

export function slotRefOf(element: Element): SlotRef {
  const parent = element.getAttribute(SLOT_PARENT_ATTR);
  return {
    parentId: parent || null,
    slot: element.getAttribute(SLOT_NAME_ATTR) ?? '',
  };
}

/** Rectangles of the blocks directly inside a slot, in order. */
export function slotChildRects(slot: Element): Rect[] {
  return Array.from(slot.children)
    .filter(child => child.hasAttribute(NODE_ATTR))
    .map(
      child => contentsRect(child) ?? { left: 0, top: 0, width: 0, height: 0 }
    );
}

/** Side by side when the second block starts above the first one's middle. */
export function slotAxis(slot: Element, children: Rect[]): Axis {
  if (children.length >= 2) {
    const [first, second] = children;
    return second.top < first.top + first.height / 2 ? 'x' : 'y';
  }
  const style = slot.ownerDocument.defaultView?.getComputedStyle(slot);
  const row =
    style?.display.includes('flex') && style.flexDirection.startsWith('row');
  return row ? 'x' : 'y';
}

export type DropTarget = {
  position: SlotPosition;
  line: Rect;
  slot: Rect;
  noop?: boolean;
};

/**
 * The deepest slot under the pointer that accepts the dragged block, with the
 * insert index and drop line. Falls back to the page's top level.
 */
export function findDropTarget(
  doc: Document,
  point: Point,
  accepts: (slot: SlotRef) => boolean,
  previousTarget?: DropTarget | null
): DropTarget | null {
  const hit = doc.elementFromPoint(point.x, point.y);
  let element: Element | null = hit?.closest(`[${SLOT_ATTR}]`) ?? null;
  while (element) {
    const ref = slotRefOf(element);
    if (accepts(ref)) return targetIn(element, ref, point, previousTarget);
    element = element.parentElement?.closest(`[${SLOT_ATTR}]`) ?? null;
  }
  const root = doc.querySelector(`[${SLOT_ATTR}][${SLOT_PARENT_ATTR}=""]`);
  if (root && accepts(slotRefOf(root)))
    return targetIn(root, slotRefOf(root), point, previousTarget);
  return null;
}

function targetIn(
  element: Element,
  ref: SlotRef,
  point: Point,
  previousTarget?: DropTarget | null
): DropTarget {
  const children = slotChildRects(element);
  const axis = slotAxis(element, children);
  const slot = toRect(element.getBoundingClientRect());
  const prevIndex =
    previousTarget?.position.parentId === ref.parentId &&
    previousTarget?.position.slot === ref.slot
      ? previousTarget.position.index
      : undefined;
  const index = dropIndex(children, point, axis, prevIndex, 12);
  return {
    position: { ...ref, index },
    line: dropLine(children, index, axis, slot),
    slot,
  };
}

/** The deepest slot under the pointer, whether or not it would accept the current drag (R721). */
export function nearestSlot(
  doc: Document,
  point: Point
): { ref: SlotRef; rect: Rect } | null {
  const hit = doc.elementFromPoint(point.x, point.y);
  const element =
    hit?.closest(`[${SLOT_ATTR}]`) ??
    doc.querySelector(`[${SLOT_ATTR}][${SLOT_PARENT_ATTR}=""]`);
  if (!element) return null;
  return {
    ref: slotRefOf(element),
    rect: toRect(element.getBoundingClientRect()),
  };
}

/** Every block's id and rect, for marquee selection across nesting levels (R719). */
export function allNodeRects(doc: Document): { id: NodeId; rect: Rect }[] {
  return Array.from(doc.querySelectorAll(`[${NODE_ATTR}]`))
    .map(el => ({
      id: el.getAttribute(NODE_ATTR) as NodeId,
      rect: contentsRect(el),
    }))
    .filter((entry): entry is { id: NodeId; rect: Rect } => !!entry.rect);
}

function distanceToRect(p: Point, r: Rect): number {
  const dx = Math.max(r.left - p.x, 0, p.x - (r.left + r.width));
  const dy = Math.max(r.top - p.y, 0, p.y - (r.top + r.height));
  return Math.hypot(dx, dy);
}

/**
 * The gap nearest the pointer, for the "+" quick-insert affordance shown
 * between blocks on hover (R713). Only returns a gap within `threshold`
 * pixels, so the button does not fight with block selection.
 * If `avoid` rects are provided and the default center point is within 18px of any,
 * shifts x along the line (try centre, then centre ± 40px, else left+24).
 */
export function hoverInsertTarget(
  doc: Document,
  point: Point,
  threshold = 10,
  avoid: Rect[] = []
): {
  position: SlotPosition;
  buttonPoint: Point;
  line: { left: number; width: number };
} | null {
  const hit = doc.elementFromPoint(point.x, point.y);
  const element = hit?.closest(`[${SLOT_ATTR}]`);
  if (!element) return null;
  const ref = slotRefOf(element);
  const children = slotChildRects(element);
  if (children.length === 0) return null;
  const axis = slotAxis(element, children);
  const index = dropIndex(children, point, axis);
  const line = dropLine(
    children,
    index,
    axis,
    toRect(element.getBoundingClientRect())
  );
  const distance =
    axis === 'y'
      ? Math.abs(point.y - (line.top + line.height / 2))
      : Math.abs(point.x - (line.left + line.width / 2));
  if (distance > threshold) return null;

  const defaultX = line.left + line.width / 2;
  const buttonY = line.top + line.height / 2;
  let finalX = defaultX;

  if (avoid.length > 0) {
    const collides = (x: number) =>
      avoid.some(r => distanceToRect({ x, y: buttonY }, r) < 18);

    if (collides(defaultX)) {
      const isFree = (candX: number) =>
        candX >= line.left &&
        candX <= line.left + line.width &&
        !collides(candX);

      if (isFree(defaultX + 40)) {
        finalX = defaultX + 40;
      } else if (isFree(defaultX - 40)) {
        finalX = defaultX - 40;
      } else {
        finalX = line.left + 24;
      }
    }
  }

  return {
    position: { ...ref, index },
    buttonPoint: {
      x: finalX,
      y: buttonY,
    },
    line: {
      left: line.left,
      width: line.width,
    },
  };
}
