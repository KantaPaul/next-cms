import { type RefObject, useLayoutEffect, useRef } from 'react';

type Point = { left: number; top: number };

/** How far a child must be pushed back to appear at its old position. */
export function flipDelta(
  prev: Point | undefined,
  next: Point
): { dx: number; dy: number } | null {
  if (!prev) return null;
  const dx = prev.left - next.left;
  const dy = prev.top - next.top;
  if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return null;
  return { dx, dy };
}

/** False under reduced motion or inside `data-ne-motion="off"`. */
export function motionAllowed(el: Element): boolean {
  if (el.closest('[data-ne-motion="off"]')) return false;
  if (typeof window === 'undefined' || !window.matchMedia) return true;
  return !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

const FLIP_MS = 200;

/**
 * FLIP-animates a list's direct children when their order changes, so a row
 * moved with ↑/↓ visibly slides into its new slot. `keys[i]` names the i-th
 * child. Positions are re-read on every commit, so a drag library that moves
 * rows with transforms leaves no stale "old" position behind.
 */
export function useFlip<T extends HTMLElement>(
  listRef: RefObject<T | null>,
  keys: readonly (string | number)[]
) {
  const rects = useRef(new Map<string | number, Point>());
  const signature = useRef<string | null>(null);
  const sig = keys.join('\u0000');

  // Runs after every render on purpose (see above).
  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const children = Array.from(list.children) as HTMLElement[];
    const reordered = signature.current !== null && signature.current !== sig;
    const animate = reordered && motionAllowed(list);
    const next = new Map<string | number, Point>();

    children.forEach((child, i) => {
      const key = keys[i] ?? i;
      const r = child.getBoundingClientRect();
      const point = { left: r.left, top: r.top };
      next.set(key, point);
      const delta = animate ? flipDelta(rects.current.get(key), point) : null;
      if (!delta || child.style.transform) return;

      child.style.transition = 'none';
      child.style.transform = `translate(${delta.dx}px, ${delta.dy}px)`;
      child.dataset.neFlipping = '';
      requestAnimationFrame(() => {
        child.style.transition = `transform var(--ne-duration-normal) var(--ne-ease-out)`;
        child.style.transform = '';
        const done = () => {
          child.style.transition = '';
          delete child.dataset.neFlipping;
        };
        child.addEventListener('transitionend', done, { once: true });
        setTimeout(done, FLIP_MS + 100);
      });
    });

    rects.current = next;
    signature.current = sig;
  });
}
