import { ChevronLeft, ChevronRight } from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '../lib/cn';
import {
  SlidingIndicator,
  useSlidingIndicator,
} from '../lib/motion/useSlidingIndicator';

export interface PanelTabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: number | string;
  disabled?: boolean;
  /** Shows a modified dot: something in this tab differs from its default. */
  changed?: boolean;
  /** Keyboard shortcut shown in the tooltip, e.g. "⌥C". */
  shortcut?: string;
}

export interface PanelTabsProps {
  tabs: PanelTabItem[];
  activeTab: string;
  onChange: (tabId: string) => void;
  variant?: 'default' | 'compact' | 'segmented';
  ariaLabel?: string;
  className?: string;
}

/** "⌥C" / "Alt+C" → "Alt+C" for aria-keyshortcuts. */
function ariaShortcut(shortcut: string): string {
  return shortcut.replace(/^⌥\s*/, 'Alt+').replace(/^Alt\s*\+\s*/i, 'Alt+');
}

export const PanelTabs: React.FC<PanelTabsProps> = ({
  tabs,
  activeTab,
  onChange,
  variant = 'default',
  ariaLabel = 'Panel tabs',
  className,
}) => {
  const listRef = useRef<HTMLDivElement>(null);
  useSlidingIndicator(listRef, activeTab);

  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<{ x: number; scrollLeft: number }>({
    x: 0,
    scrollLeft: 0,
  });
  const didDragRef = useRef(false);

  const checkScroll = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 2);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 2);
  }, []);

  useEffect(() => {
    checkScroll();
    const el = listRef.current;
    if (!el) return;
    el.addEventListener('scroll', checkScroll, { passive: true });
    const ro =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(checkScroll)
        : null;
    ro?.observe(el);
    return () => {
      el.removeEventListener('scroll', checkScroll);
      ro?.disconnect();
    };
  }, [checkScroll, tabs]);

  useEffect(() => {
    if (!listRef.current) return;
    const activeEl = listRef.current.querySelector<HTMLElement>(
      '[data-ne-active="true"]'
    );
    if (activeEl) {
      activeEl.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'nearest',
      });
      const timer = setTimeout(checkScroll, 350);
      return () => clearTimeout(timer);
    }
  }, [activeTab, checkScroll]);

  const onWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    if (event.deltaY !== 0 && !event.deltaX && listRef.current) {
      listRef.current.scrollLeft += event.deltaY;
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0 || !listRef.current) return;
    isDraggingRef.current = true;
    didDragRef.current = false;
    dragStartRef.current = {
      x: e.pageX,
      scrollLeft: listRef.current.scrollLeft,
    };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current || !listRef.current) return;
    const dx = e.pageX - dragStartRef.current.x;
    if (Math.abs(dx) > 3) {
      if (!didDragRef.current) {
        didDragRef.current = true;
        setIsDragging(true);
      }
      listRef.current.scrollLeft = dragStartRef.current.scrollLeft - dx;
    }
  };

  const handleMouseUpOrLeave = () => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      setIsDragging(false);
    }
  };

  const scrollByAmount = (delta: number) => {
    listRef.current?.scrollBy({ left: delta, behavior: 'smooth' });
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const enabledTabs = tabs.filter(t => !t.disabled);
    const currentIndex = enabledTabs.findIndex(t => t.id === activeTab);
    if (currentIndex < 0) return;

    let nextIndex = -1;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      nextIndex = (currentIndex + 1) % enabledTabs.length;
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      nextIndex = (currentIndex - 1 + enabledTabs.length) % enabledTabs.length;
    } else if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = enabledTabs.length - 1;
    }

    if (nextIndex >= 0) {
      event.preventDefault();
      onChange(enabledTabs[nextIndex].id);
    }
  };

  const isSegmented = variant === 'segmented';

  return (
    <div
      className={cn(
        'relative group min-w-0 select-none',
        isSegmented ? 'mx-2 my-1.5' : '',
        className
      )}
    >
      {canScrollLeft && (
        <button
          type="button"
          tabIndex={-1}
          aria-label="Scroll tabs left"
          onClick={() => scrollByAmount(-120)}
          className="absolute left-0.5 top-1/2 -translate-y-1/2 z-10 flex h-6 w-5 items-center justify-center rounded bg-[var(--ne-surface)]/90 backdrop-blur-sm text-[var(--ne-text-muted)] hover:text-[var(--ne-text)] shadow-sm border border-[var(--ne-border)] cursor-pointer transition-all hover:bg-[var(--ne-surface-hover)]"
        >
          <ChevronLeft size={13} />
        </button>
      )}
      <div
        ref={listRef}
        role="tablist"
        aria-label={ariaLabel}
        onKeyDown={onKeyDown}
        onWheel={onWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUpOrLeave}
        onMouseLeave={handleMouseUpOrLeave}
        style={{
          overflowX: 'auto',
          overflowY: 'hidden',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          cursor: isDragging ? 'grabbing' : undefined,
        }}
        className={cn(
          'relative flex items-center gap-1 border-b border-[var(--ne-border)] bg-[var(--ne-surface)] px-2 ne-no-scrollbar',
          isSegmented &&
            'rounded-md border border-[var(--ne-border)] bg-[var(--ne-surface-subtle)] p-0.5 border-b-[var(--ne-border)]'
        )}
      >
        {variant !== 'compact' && (
          <SlidingIndicator
            className={variant === 'default' ? 'ne-indicator-line' : undefined}
          />
        )}
        {tabs.map(tab => {
          const isSelected = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              role="tab"
              type="button"
              aria-selected={isSelected}
              aria-controls={`panel-tabpanel-${tab.id}`}
              id={`panel-tab-${tab.id}`}
              disabled={tab.disabled}
              tabIndex={isSelected ? 0 : -1}
              title={tab.shortcut ? `${tab.label} (${tab.shortcut})` : undefined}
              aria-keyshortcuts={tab.shortcut ? ariaShortcut(tab.shortcut) : undefined}
              data-ne-active={isSelected ? 'true' : undefined}
              onClick={e => {
                if (didDragRef.current) {
                  e.preventDefault();
                  e.stopPropagation();
                  return;
                }
                onChange(tab.id);
              }}
              className={cn(
                'ne-press relative flex h-8 shrink-0 items-center gap-1.5 px-2.5 text-xs font-medium transition-colors select-none',
                variant === 'segmented'
                  ? isSelected
                    ? 'rounded text-[var(--ne-text)]'
                    : 'rounded text-[var(--ne-text-muted)] hover:text-[var(--ne-text)]'
                  : isSelected
                    ? 'text-[var(--ne-primary)] font-semibold'
                    : 'text-[var(--ne-text-muted)] hover:text-[var(--ne-text)]',
                tab.disabled && 'cursor-not-allowed opacity-40'
              )}
            >
              {tab.icon && (
                <span className="shrink-0 flex items-center justify-center">
                  {tab.icon}
                </span>
              )}
              <span className="truncate">{tab.label}</span>
              {tab.changed && (
                <span
                  data-modified-dot=""
                  aria-label="Has changes"
                  className={cn(
                    'ne-motion-pop-in h-1.5 w-1.5 shrink-0 rounded-full transition-colors',
                    isSelected
                      ? 'bg-[var(--ne-primary)]'
                      : 'bg-[var(--ne-text-muted)]'
                  )}
                />
              )}
              {tab.badge !== undefined && (
                <span
                  className={cn(
                    'ml-0.5 px-1.5 py-0.2 text-[10px] font-bold rounded-full',
                    isSelected
                      ? 'bg-[var(--ne-primary-soft)] text-[var(--ne-primary)]'
                      : 'bg-[var(--ne-surface-subtle)] text-[var(--ne-text-muted)]'
                  )}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
      {canScrollRight && (
        <button
          type="button"
          tabIndex={-1}
          aria-label="Scroll tabs right"
          onClick={() => scrollByAmount(120)}
          className="absolute right-0.5 top-1/2 -translate-y-1/2 z-10 flex h-6 w-5 items-center justify-center rounded bg-[var(--ne-surface)]/90 backdrop-blur-sm text-[var(--ne-text-muted)] hover:text-[var(--ne-text)] shadow-sm border border-[var(--ne-border)] cursor-pointer transition-all hover:bg-[var(--ne-surface-hover)]"
        >
          <ChevronRight size={13} />
        </button>
      )}
    </div>
  );
};
