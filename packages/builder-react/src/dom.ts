/**
 * Finding and measuring blocks and slots inside the canvas document. Blocks
 * are wrapped in `display: contents` elements, so their wrapper adds no box
 * and published layout is unchanged; a block's rectangle is its children's.
 */

import type { NodeId, SlotPosition, SlotRef } from '@nextcms/builder-core';
import { type Axis, dropIndex, dropLine, type Point, type Rect, unionRect } from './drop';

export const NODE_ATTR = 'data-builder-node';
export const SLOT_ATTR = 'data-builder-slot';
export const SLOT_PARENT_ATTR = 'data-slot-parent';
export const SLOT_NAME_ATTR = 'data-slot-name';

const toRect = (r: DOMRect): Rect => ({ left: r.left, top: r.top, width: r.width, height: r.height });

/** The box a `display: contents` wrapper's content takes up. */
export function contentsRect(element: Element): Rect | null {
  return unionRect(Array.from(element.children, child => toRect(child.getBoundingClientRect())));
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
  return { parentId: parent || null, slot: element.getAttribute(SLOT_NAME_ATTR) ?? '' };
}

/** Rectangles of the blocks directly inside a slot, in order. */
export function slotChildRects(slot: Element): Rect[] {
  return Array.from(slot.children)
    .filter(child => child.hasAttribute(NODE_ATTR))
    .map(child => contentsRect(child) ?? { left: 0, top: 0, width: 0, height: 0 });
}

/** Side by side when the second block starts above the first one's middle. */
export function slotAxis(slot: Element, children: Rect[]): Axis {
  if (children.length >= 2) {
    const [first, second] = children;
    return second.top < first.top + first.height / 2 ? 'x' : 'y';
  }
  const style = slot.ownerDocument.defaultView?.getComputedStyle(slot);
  const row = style?.display.includes('flex') && style.flexDirection.startsWith('row');
  return row ? 'x' : 'y';
}

export type DropTarget = { position: SlotPosition; line: Rect; slot: Rect };

/**
 * The deepest slot under the pointer that accepts the dragged block, with the
 * insert index and drop line. Falls back to the page's top level.
 */
export function findDropTarget(
  doc: Document,
  point: Point,
  accepts: (slot: SlotRef) => boolean
): DropTarget | null {
  const hit = doc.elementFromPoint(point.x, point.y);
  let element: Element | null = hit?.closest(`[${SLOT_ATTR}]`) ?? null;
  while (element) {
    const ref = slotRefOf(element);
    if (accepts(ref)) return targetIn(element, ref, point);
    element = element.parentElement?.closest(`[${SLOT_ATTR}]`) ?? null;
  }
  const root = doc.querySelector(`[${SLOT_ATTR}][${SLOT_PARENT_ATTR}=""]`);
  if (root && accepts(slotRefOf(root))) return targetIn(root, slotRefOf(root), point);
  return null;
}

function targetIn(element: Element, ref: SlotRef, point: Point): DropTarget {
  const children = slotChildRects(element);
  const axis = slotAxis(element, children);
  const slot = toRect(element.getBoundingClientRect());
  const index = dropIndex(children, point, axis);
  return { position: { ...ref, index }, line: dropLine(children, index, axis, slot), slot };
}
