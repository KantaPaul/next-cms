import { Monitor, Smartphone, Tablet, ZoomIn, ZoomOut } from 'lucide-react';
import React, { useRef } from 'react';
import { cn } from '../lib/cn';
import {
  RollingNumber,
  SlidingIndicator,
  flashValue,
  useHoldRepeat,
  useSlidingIndicator,
} from '../lib/motion';
import type { DeviceType } from '../inspector/DeviceValueBadge';

export interface FloatingDeviceBarProps {
  device: DeviceType;
  onDeviceChange: (device: DeviceType) => void;
  zoom?: number;
  onZoomChange?: (zoom: number) => void;
  className?: string;
}

export const ZOOM_MIN = 50;
export const ZOOM_MAX = 150;
export const ZOOM_STEP = 10;

/** Next zoom after one step, kept inside the allowed range. */
export function stepZoom(zoom: number, direction: 1 | -1): number {
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom + direction * ZOOM_STEP));
}

const DEVICES: { id: DeviceType; label: string; Icon: typeof Monitor }[] = [
  { id: 'desktop', label: 'Desktop view', Icon: Monitor },
  { id: 'tablet', label: 'Tablet view', Icon: Tablet },
  { id: 'mobile', label: 'Mobile view', Icon: Smartphone },
];

export const FloatingDeviceBar: React.FC<FloatingDeviceBarProps> = ({
  device,
  onDeviceChange,
  zoom = 100,
  onZoomChange,
  className,
}) => {
  const groupRef = useRef<HTMLDivElement | null>(null);
  useSlidingIndicator(groupRef, device);
  // Steps read the latest zoom so a held button keeps counting.
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;
  const step = (direction: 1 | -1) => {
    const next = stepZoom(zoomRef.current, direction);
    if (next === zoomRef.current) return false;
    zoomRef.current = next;
    onZoomChange?.(next);
    return stepZoom(next, direction) !== next;
  };
  const zoomOut = useHoldRepeat(() => step(-1));
  const zoomIn = useHoldRepeat(() => step(1));
  return (
    <div
      role="toolbar"
      aria-label="Canvas viewport controls"
      className={cn(
        'ne-motion-enter sticky top-3 z-30 mb-4 flex items-center gap-1.5 rounded-full border border-[var(--ne-border)] bg-[var(--ne-surface)]/95 px-2 py-1 shadow-md backdrop-blur-md transition-all select-none',
        className
      )}
    >
      {/* Device switcher */}
      <div
        ref={groupRef}
        role="group"
        aria-label="Device preview"
        className="relative flex items-center gap-0.5 rounded-full bg-[var(--ne-surface-subtle)] p-0.5"
        style={{ '--ne-ind-radius': '9999px' } as React.CSSProperties}
      >
        <SlidingIndicator />
        {DEVICES.map(({ id, label, Icon }) => {
          const active = device === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onDeviceChange(id)}
              aria-label={label}
              aria-pressed={active}
              title={label}
              data-ne-active={active ? 'true' : undefined}
              className={cn(
                'ne-press flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-[var(--ne-focus-ring)]',
                active
                  ? 'text-[var(--ne-primary)] font-semibold'
                  : 'text-[var(--ne-text-muted)] hover:text-[var(--ne-text)]'
              )}
            >
              {/* The icon pops when its device becomes active. */}
              <Icon
                aria-hidden
                className={cn('h-3.5 w-3.5', active && 'ne-motion-pop-in')}
              />
              <span className="hidden sm:inline capitalize">{id}</span>
            </button>
          );
        })}
      </div>

      {/* Divider */}
      {onZoomChange && (
        <>
          <div className="h-3.5 w-[1px] bg-[var(--ne-border)] shrink-0" />
          <div className="flex items-center gap-0.5 text-xs text-[var(--ne-text-muted)] font-mono pr-1">
            <button
              type="button"
              {...zoomOut}
              disabled={zoom <= ZOOM_MIN}
              aria-label="Zoom out"
              title="Zoom out (hold to repeat)"
              className="ne-press p-1 rounded-full hover:bg-[var(--ne-surface-hover)] hover:text-[var(--ne-text)] transition-[color,background-color,opacity] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={e => {
                if (zoom !== 100) flashValue(e.currentTarget);
                onZoomChange(100);
              }}
              aria-label={`Zoom ${zoom}%. Reset zoom to 100%`}
              title="Reset zoom to 100%"
              className="ne-press min-w-[3.25rem] rounded-full px-1.5 py-0.5 text-[11px] tabular-nums font-semibold hover:text-[var(--ne-primary)] transition-colors cursor-pointer"
            >
              <RollingNumber value={`${zoom}%`} />
            </button>
            <button
              type="button"
              {...zoomIn}
              disabled={zoom >= ZOOM_MAX}
              aria-label="Zoom in"
              title="Zoom in (hold to repeat)"
              className="ne-press p-1 rounded-full hover:bg-[var(--ne-surface-hover)] hover:text-[var(--ne-text)] transition-[color,background-color,opacity] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </button>
          </div>
        </>
      )}
    </div>
  );
};
