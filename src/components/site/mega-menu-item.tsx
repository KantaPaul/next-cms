'use client';

import {
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { cn } from '@/lib/utils/cn';

const CLOSE_DELAY = 150;
/** Space between the header's bottom edge and an open dropdown or mega menu. */
const HEADER_GAP = 8;

const headerBarOf = (node: Element) => node.closest('[data-header-bar]');

/**
 * A top-level menu item that opens a mega menu panel on desktop. The panel is
 * fixed under the whole header bar (not under the link) so it can span the
 * header's width. Opens on hover (with a short close delay so the pointer
 * can travel to the panel), on keyboard focus, or on click when
 * `trigger="click"`. Escape and outside clicks close it.
 */
export function MegaMenuItem({
  link,
  panel,
  trigger = 'hover',
  className,
}: {
  link: ReactNode;
  panel: ReactNode;
  trigger?: 'hover' | 'click';
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [top, setTop] = useState(0);
  const itemRef = useRef<HTMLLIElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const panelId = useId();

  const cancelClose = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };
  const show = () => {
    cancelClose();
    setOpen(true);
  };
  const hideSoon = () => {
    cancelClose();
    timer.current = setTimeout(() => setOpen(false), CLOSE_DELAY);
  };

  // Sit under the header bar this item lives in. A header with a backdrop blur
  // is the containing block for `position: fixed`, so `top` is relative to it,
  // not the viewport. Working from where the panel landed covers both cases.
  const measure = useCallback(() => {
    const item = itemRef.current;
    const panel = panelRef.current;
    if (!item || !panel) return;
    const bar = headerBarOf(item) ?? item.closest('header') ?? item;
    const offset =
      panel.getBoundingClientRect().top - parseFloat(panel.style.top || '0');
    setTop(bar.getBoundingClientRect().bottom - offset);
  }, []);

  useLayoutEffect(() => {
    if (open) measure();
  }, [open, measure]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        itemRef.current?.querySelector<HTMLElement>('a,button')?.focus();
      }
    };
    const onPointer = (e: PointerEvent) => {
      if (!itemRef.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', onPointer);
    window.addEventListener('scroll', measure, { passive: true });
    window.addEventListener('resize', measure);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pointerdown', onPointer);
      window.removeEventListener('scroll', measure);
      window.removeEventListener('resize', measure);
    };
  }, [open, measure]);

  useEffect(() => cancelClose, []);

  const hover = trigger === 'hover';

  return (
    <li
      ref={itemRef}
      className={cn('flex items-center', className)}
      onMouseEnter={hover ? show : undefined}
      onMouseLeave={hover ? hideSoon : undefined}
      onFocus={show}
      onBlur={e => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) hideSoon();
      }}
    >
      <span className="inline-flex items-center gap-1">
        {link}
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          aria-label="Toggle menu panel"
          onClick={() => (open ? setOpen(false) : show())}
          className="inline-flex size-5 items-center justify-center rounded opacity-70 hover:opacity-100"
        >
          <svg
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
            className={cn(
              'size-3.5 transition-transform',
              open && 'rotate-180'
            )}
          >
            <path d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.17l3.71-3.94a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z" />
          </svg>
        </button>
      </span>
      <div
        ref={panelRef}
        id={panelId}
        role="region"
        aria-label="Menu panel"
        hidden={!open}
        className="fixed inset-x-0 z-50 hidden px-4 lg:block"
        style={{
          top,
          paddingTop: HEADER_GAP,
          display: open ? undefined : 'none',
        }}
        onMouseEnter={hover ? show : undefined}
        onMouseLeave={hover ? hideSoon : undefined}
      >
        <div className="duration-150 animate-in fade-in-0 slide-in-from-top-1">
          {panel}
        </div>
      </div>
    </li>
  );
}

/**
 * A top-level menu item with a plain dropdown. CSS opens the dropdown; this only
 * tells it how far the header bar extends below the link, so it opens under the
 * header, not inside it. Outside a header bar it stays right under the link.
 */
export function DropdownMenuItem({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const itemRef = useRef<HTMLLIElement>(null);

  const measure = useCallback(() => {
    const item = itemRef.current;
    if (!item) return;
    const bar = headerBarOf(item);
    if (!bar) return;
    const offset =
      bar.getBoundingClientRect().bottom -
      item.getBoundingClientRect().bottom +
      HEADER_GAP;
    item.style.setProperty('--dropdown-offset', `${Math.max(offset, 0)}px`);
  }, []);

  useLayoutEffect(measure, [measure]);

  return (
    <li
      ref={itemRef}
      className={className}
      onMouseEnter={measure}
      onFocus={measure}
    >
      {children}
    </li>
  );
}
