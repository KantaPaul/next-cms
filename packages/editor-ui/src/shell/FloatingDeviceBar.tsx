import React from 'react';
import { Monitor, Smartphone, Tablet, ZoomIn, ZoomOut } from 'lucide-react';
import { cn } from '../lib/cn';
import type { DeviceType } from '../inspector/DeviceValueBadge';

export interface FloatingDeviceBarProps {
  device: DeviceType;
  onDeviceChange: (device: DeviceType) => void;
  zoom?: number;
  onZoomChange?: (zoom: number) => void;
  className?: string;
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
        role="group"
        aria-label="Device preview"
        className="flex items-center gap-0.5 rounded-full bg-[var(--ne-surface-subtle)] p-0.5"
      >
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
              className={cn(
                'flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-[var(--ne-focus-ring)]',
                active
                  ? 'bg-[var(--ne-surface)] text-[var(--ne-primary)] shadow-2xs font-semibold'
                  : 'text-[var(--ne-text-muted)] hover:text-[var(--ne-text)]'
              )}
            >
              <Icon className="h-3.5 w-3.5" />
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
              onClick={() => onZoomChange(Math.max(50, zoom - 10))}
              aria-label="Zoom out"
              title="Zoom out"
              className="p-1 rounded-full hover:bg-[var(--ne-surface-hover)] hover:text-[var(--ne-text)] transition-colors cursor-pointer"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onZoomChange(100)}
              aria-label="Reset zoom to 100%"
              title="Reset zoom to 100%"
              className="px-1.5 py-0.5 text-[11px] tabular-nums font-semibold hover:text-[var(--ne-primary)] transition-colors cursor-pointer"
            >
              {zoom}%
            </button>
            <button
              type="button"
              onClick={() => onZoomChange(Math.min(150, zoom + 10))}
              aria-label="Zoom in"
              title="Zoom in"
              className="p-1 rounded-full hover:bg-[var(--ne-surface-hover)] hover:text-[var(--ne-text)] transition-colors cursor-pointer"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </button>
          </div>
        </>
      )}
    </div>
  );
};
