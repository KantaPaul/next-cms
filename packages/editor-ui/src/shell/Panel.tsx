import { ChevronLeft, ChevronRight } from 'lucide-react';
import type React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '../lib/cn';

/**
 * Resizable, collapsible side panel (B15 E3, gap G5). Resizes with pointer
 * events or the arrow keys on its handle (Shift for bigger steps, Home/End
 * for min/max). Width and collapsed state are remembered per browser under
 * `storageKey`, read after mount so server and client HTML agree.
 * `side` is logical: "left" is the inline start, so it flips in RTL.
 */
export interface PanelProps {
  side: 'left' | 'right';
  title?: React.ReactNode;
  defaultWidth?: number;
  minWidth?: number;
  maxWidth?: number;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  /** localStorage key for the remembered width and collapsed state; omit to not persist. */
  storageKey?: string;
  headerAction?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

const KEY_STEP = 8;
const KEY_STEP_LARGE = 40;

type Stored = { width: number; collapsed: boolean };

export function readPanelState(
  key: string | undefined,
  fallback: Stored
): Stored {
  if (!key || typeof localStorage === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return fallback;
    const { width, collapsed } = parsed as Partial<Stored>;
    return {
      width: typeof width === 'number' ? width : fallback.width,
      collapsed:
        typeof collapsed === 'boolean' ? collapsed : fallback.collapsed,
    };
  } catch {
    return fallback;
  }
}

export const Panel: React.FC<PanelProps> = ({
  side,
  title,
  defaultWidth = 280,
  minWidth = 200,
  maxWidth = 480,
  collapsible = true,
  defaultCollapsed = false,
  storageKey,
  headerAction,
  children,
  className,
}) => {
  const [width, setWidth] = useState(defaultWidth);
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const [resizing, setResizing] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const asideRef = useRef<HTMLElement>(null);
  const isStart = side === 'left';
  const label =
    typeof title === 'string' ? title : isStart ? 'side panel' : 'inspector';

  const clamp = useCallback(
    (value: number) =>
      Math.min(maxWidth, Math.max(minWidth, Math.round(value))),
    [minWidth, maxWidth]
  );

  useEffect(() => {
    const stored = readPanelState(storageKey, {
      width: defaultWidth,
      collapsed: defaultCollapsed,
    });
    setWidth(clamp(stored.width));
    setCollapsed(stored.collapsed);
    setHydrated(true);
  }, [storageKey, defaultWidth, defaultCollapsed, clamp]);

  useEffect(() => {
    if (!storageKey || !hydrated) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify({ width, collapsed }));
    } catch {
      // Private browsing or a full quota; the panel still works this session.
    }
  }, [storageKey, width, collapsed, hydrated]);

  // In RTL the start edge is on the right, so pointer deltas flip.
  const growsRightward = () => {
    const rtl = asideRef.current
      ? getComputedStyle(asideRef.current).direction === 'rtl'
      : false;
    return isStart !== rtl;
  };

  const onHandlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    const handle = event.currentTarget;
    handle.setPointerCapture(event.pointerId);
    const startX = event.clientX;
    const startWidth = width;
    const sign = growsRightward() ? 1 : -1;
    setResizing(true);

    const onMove = (move: PointerEvent) =>
      setWidth(clamp(startWidth + sign * (move.clientX - startX)));
    const onUp = () => {
      setResizing(false);
      handle.removeEventListener('pointermove', onMove);
      handle.removeEventListener('pointerup', onUp);
      handle.removeEventListener('pointercancel', onUp);
    };
    handle.addEventListener('pointermove', onMove);
    handle.addEventListener('pointerup', onUp);
    handle.addEventListener('pointercancel', onUp);
  };

  const onHandleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? KEY_STEP_LARGE : KEY_STEP;
    // ArrowRight widens a start panel in LTR; the visual direction wins in RTL.
    const rightward = growsRightward() ? 1 : -1;
    // Functional updates so repeated keys before a re-render all count.
    let next: ((current: number) => number) | null = null;
    if (event.key === 'ArrowRight') next = w => w + step * rightward;
    else if (event.key === 'ArrowLeft') next = w => w - step * rightward;
    else if (event.key === 'Home') next = () => minWidth;
    else if (event.key === 'End') next = () => maxWidth;
    else if (event.key === 'Enter' && collapsible) {
      event.preventDefault();
      setCollapsed(true);
      return;
    }
    if (next === null) return;
    event.preventDefault();
    const update = next;
    setWidth(w => clamp(update(w)));
  };

  const CollapseIcon = isStart ? ChevronLeft : ChevronRight;
  const ExpandIcon = isStart ? ChevronRight : ChevronLeft;

  if (collapsed) {
    return (
      <div
        className={cn(
          'relative flex w-9 shrink-0 select-none flex-col items-center justify-start border-[var(--ne-border)] bg-[var(--ne-surface)] py-2',
          isStart ? 'border-e' : 'border-s',
          className
        )}
      >
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          aria-label={`Expand ${label}`}
          title={`Expand ${label}`}
          className="cursor-pointer rounded-[var(--ne-radius-sm)] p-1 text-[var(--ne-text-muted)] hover:bg-[var(--ne-surface-hover)] hover:text-[var(--ne-text)] focus-visible:outline-2 focus-visible:outline-[var(--ne-focus-ring)]"
        >
          <ExpandIcon className="h-3.5 w-3.5 rtl:-scale-x-100" />
        </button>
        {title && (
          <div className="mt-4 rotate-180 text-[11px] font-medium uppercase tracking-wider text-[var(--ne-text-muted)] [writing-mode:vertical-rl]">
            {title}
          </div>
        )}
      </div>
    );
  }

  return (
    <aside
      ref={asideRef}
      aria-label={label}
      style={{ width }}
      className={cn(
        'relative flex h-full shrink-0 flex-col border-[var(--ne-border)] bg-[var(--ne-surface)]',
        isStart ? 'border-e' : 'border-s',
        !resizing && 'transition-[width] duration-[var(--ne-duration-fast)]',
        className
      )}
    >
      {(title || headerAction || collapsible) && (
        <div className="flex h-9 shrink-0 items-center justify-between gap-2 border-b border-[var(--ne-border)] bg-[var(--ne-surface)] px-3">
          <div className="truncate text-xs font-semibold text-[var(--ne-text)]">
            {title}
          </div>
          <div className="flex items-center gap-1">
            {headerAction}
            {collapsible && (
              <button
                type="button"
                onClick={() => setCollapsed(true)}
                aria-label={`Collapse ${label}`}
                title={`Collapse ${label}`}
                className="cursor-pointer rounded-[var(--ne-radius-sm)] p-1 text-[var(--ne-text-muted)] hover:bg-[var(--ne-surface-hover)] hover:text-[var(--ne-text)] focus-visible:outline-2 focus-visible:outline-[var(--ne-focus-ring)]"
              >
                <CollapseIcon className="h-3.5 w-3.5 rtl:-scale-x-100" />
              </button>
            )}
          </div>
        </div>
      )}

      <div className="ne-scrollbar relative flex flex-1 flex-col overflow-auto">
        {children}
      </div>

      <div
        role="separator"
        aria-orientation="vertical"
        aria-label={`Resize ${label}`}
        aria-valuenow={width}
        aria-valuemin={minWidth}
        aria-valuemax={maxWidth}
        tabIndex={0}
        onPointerDown={onHandlePointerDown}
        onKeyDown={onHandleKeyDown}
        title="Drag or use arrow keys to resize"
        className={cn(
          'absolute inset-y-0 z-30 w-2.5 cursor-col-resize touch-none transition-colors hover:bg-[var(--ne-primary)]/20 focus-visible:bg-[var(--ne-primary)]/30 focus-visible:outline-none',
          isStart ? '-end-1.5' : '-start-1.5',
          resizing && 'bg-[var(--ne-primary)]/30'
        )}
      />
    </aside>
  );
};
