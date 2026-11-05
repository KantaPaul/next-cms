import {
  type RefObject,
  createElement,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
} from 'react';

/** Box of the active item, relative to its positioned container. */
export interface IndicatorBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

type OffsetBox = Pick<
  HTMLElement,
  'offsetLeft' | 'offsetTop' | 'offsetWidth' | 'offsetHeight'
> & { offsetParent?: unknown };

/**
 * Reads the active item's layout box relative to `container`, walking up
 * positioned ancestors when the item is nested. Offsets ignore transforms,
 * so a button scaled by `ne-press` doesn't shrink the indicator mid-press.
 */
export function measureIndicator(
  active: OffsetBox,
  container?: unknown
): IndicatorBox {
  let x = active.offsetLeft;
  let y = active.offsetTop;
  let parent = active.offsetParent as OffsetBox | null | undefined;
  while (container && parent && parent !== container) {
    x += parent.offsetLeft;
    y += parent.offsetTop;
    parent = parent.offsetParent as OffsetBox | null | undefined;
  }
  return { x, y, w: active.offsetWidth, h: active.offsetHeight };
}

/** CSS custom properties the `.ne-indicator` rule reads. */
export function indicatorVars(box: IndicatorBox): Record<string, string> {
  return {
    '--ne-ind-x': `${box.x}px`,
    '--ne-ind-y': `${box.y}px`,
    '--ne-ind-w': `${box.w}px`,
    '--ne-ind-h': `${box.h}px`,
  };
}

const useIsoLayoutEffect =
  typeof window === 'undefined' ? useEffect : useLayoutEffect;

/**
 * Slides one shared highlight under the active item of a segmented control.
 * The container must be `position: relative` and render a
 * `<SlidingIndicator />` as its first child. The active item carries
 * `data-ne-active="true"`. The first measurement sets `data-ne-ind-ready` so
 * the indicator appears in place without sliding in from 0.
 */
export function useSlidingIndicator<T extends HTMLElement>(
  containerRef: RefObject<T | null>,
  activeKey: string | number,
  /** Find the active item at any depth, not only among direct children. */
  { deep = false }: { deep?: boolean } = {}
) {
  const update = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const active = container.querySelector<HTMLElement>(
      deep ? '[data-ne-active="true"]' : ':scope > [data-ne-active="true"]'
    );
    if (!active) {
      container.removeAttribute('data-ne-ind-ready');
      return;
    }
    for (const [name, value] of Object.entries(
      indicatorVars(measureIndicator(active, container))
    )) {
      container.style.setProperty(name, value);
    }
    if (!container.hasAttribute('data-ne-ind-ready')) {
      // Let the first position paint before turning transitions on.
      requestAnimationFrame(() =>
        container.setAttribute('data-ne-ind-ready', '')
      );
    }
  }, [containerRef, deep]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: re-measure when the active item changes
  useIsoLayoutEffect(() => {
    update();
  }, [activeKey, update]);

  // The container can mount later than the hook (a palette that renders
  // nothing while closed), so check its identity after every commit and
  // (re)attach the resize observer when it appears or changes.
  const observed = useRef<{ el: Element | null; ro?: ResizeObserver }>({
    el: null,
  });
  useIsoLayoutEffect(() => {
    const el = containerRef.current;
    if (el === observed.current.el) return;
    observed.current.ro?.disconnect();
    observed.current = { el };
    if (!el) return;
    update();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(update);
    ro.observe(el);
    for (const child of Array.from(el.children)) ro.observe(child);
    observed.current.ro = ro;
  });
  useEffect(() => () => observed.current.ro?.disconnect(), []);

  return { update };
}

/** The highlight itself. Decorative, so hidden from assistive tech. */
export function SlidingIndicator({ className }: { className?: string }) {
  return createElement('span', {
    'aria-hidden': true,
    className: className ? `ne-indicator ${className}` : 'ne-indicator',
  });
}
