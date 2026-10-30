import * as React from 'react';
import { cn } from '../lib/cn';

export interface PanelProps {
  side: 'left' | 'right';
  title?: string;
  children: React.ReactNode;
  defaultWidth?: number;
  minWidth?: number;
  maxWidth?: number;
  storageKey?: string;
  collapsed?: boolean;
  onCollapse?: (collapsed: boolean) => void;
  className?: string;
}

export function Panel({
  side,
  title,
  children,
  defaultWidth = 280,
  minWidth = 200,
  maxWidth = 480,
  storageKey,
  collapsed = false,
  onCollapse,
  className,
}: PanelProps) {
  const [width, setWidth] = React.useState(defaultWidth);
  const [isCollapsed, setIsCollapsed] = React.useState(collapsed);
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    if (storageKey && typeof localStorage !== 'undefined') {
      try {
        const raw = localStorage.getItem(storageKey);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (typeof parsed.width === 'number') setWidth(parsed.width);
          if (typeof parsed.collapsed === 'boolean') setIsCollapsed(parsed.collapsed);
        }
      } catch {}
    }
    setHydrated(true);
  }, [storageKey]);

  React.useEffect(() => {
    if (!storageKey || !hydrated) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify({ width, collapsed: isCollapsed }));
    } catch {}
  }, [storageKey, width, isCollapsed, hydrated]);

  const handlePointerDown = React.useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      const startX = e.clientX;
      const startWidth = width;
      const onMove = (ev: PointerEvent) => {
        const delta = side === 'left' ? ev.clientX - startX : startX - ev.clientX;
        setWidth(Math.min(maxWidth, Math.max(minWidth, startWidth + delta)));
      };
      const onUp = () => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
      };
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    },
    [side, width, minWidth, maxWidth]
  );

  if (isCollapsed) {
    return (
      <div
        className={cn(
          'flex shrink-0 flex-col items-center border-[var(--ne-border)] pt-2',
          side === 'left' ? 'border-r' : 'border-l',
          className
        )}
        style={{ width: 32 }}
      >
        <button
          type="button"
          aria-label={`Expand ${title ?? 'panel'}`}
          onClick={() => {
            setIsCollapsed(false);
            onCollapse?.(false);
          }}
          className="cursor-pointer p-1.5 text-xs text-[var(--ne-text-muted)] opacity-60 hover:opacity-100"
          style={{ writingMode: 'vertical-rl' }}
        >
          {title}
        </button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'relative shrink-0 overflow-hidden border-[var(--ne-border)]',
        side === 'left' ? 'border-r' : 'border-l',
        className
      )}
      style={{ width }}
    >
      {title && (
        <div className="flex items-center justify-between px-2 py-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--ne-text-muted)] opacity-60">
            {title}
          </span>
          <button
            type="button"
            aria-label={`Collapse ${title}`}
            onClick={() => {
              setIsCollapsed(true);
              onCollapse?.(true);
            }}
            className="cursor-pointer px-1 py-0.5 text-xs text-[var(--ne-text-muted)] opacity-60 hover:opacity-100"
          >
            {side === 'left' ? '«' : '»'}
          </button>
        </div>
      )}
      <div className="h-[calc(100%-28px)] overflow-y-auto ne-scrollbar">{children}</div>
      <div
        aria-hidden
        onPointerDown={handlePointerDown}
        className="absolute top-0 bottom-0 w-1.5 cursor-ew-resize touch-none"
        style={side === 'left' ? { right: -3, zIndex: 1 } : { left: -3, zIndex: 1 }}
      />
    </div>
  );
}