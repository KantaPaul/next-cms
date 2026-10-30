import type React from 'react';
import { cn } from '../lib/cn';

/** A box in overlay coordinates. */
export interface OverlayBounds {
  top: number;
  left: number;
  width: number;
  height: number;
}

const place = (b: OverlayBounds): React.CSSProperties => ({
  top: b.top,
  left: b.left,
  width: b.width,
  height: b.height,
});

/** The container a drag would drop into, softly highlighted (B15 E5). */
export const DropZone: React.FC<{
  bounds: OverlayBounds;
  className?: string;
}> = ({ bounds, className }) => (
  <div
    aria-hidden
    style={place(bounds)}
    className={cn(
      'ne-motion-follow pointer-events-none absolute z-20 rounded-[var(--ne-radius-sm)] border border-[var(--ne-drop)]/40 bg-[var(--ne-drop)]/5',
      className
    )}
  />
);

/** The rectangle of a drag-select in progress (B15 E5). */
export const MarqueeBox: React.FC<{
  bounds: OverlayBounds;
  className?: string;
}> = ({ bounds, className }) => (
  <div
    aria-hidden
    style={place(bounds)}
    className={cn(
      'pointer-events-none absolute z-30 border border-[var(--ne-select)] bg-[var(--ne-select)]/10',
      className
    )}
  />
);

/**
 * A short message pinned to a corner of the canvas, such as why a drop is not
 * allowed (B15 E5). Announced politely; slides in.
 */
export const OverlayNotice: React.FC<{
  children: React.ReactNode;
  tone?: 'danger' | 'info';
  position?: 'bottom-start' | 'bottom-end' | 'top-start';
  className?: string;
}> = ({ children, tone = 'info', position = 'bottom-start', className }) => (
  <div
    role="status"
    aria-live="polite"
    className={cn(
      'ne-motion-enter-up pointer-events-none absolute z-40 rounded-[var(--ne-radius-md)] px-2.5 py-1 text-xs font-semibold text-white shadow-md',
      tone === 'danger' ? 'bg-[var(--ne-danger)]' : 'bg-[var(--ne-select)]',
      position === 'bottom-start' && 'bottom-3 start-3',
      position === 'bottom-end' && 'bottom-3 end-3',
      position === 'top-start' && 'start-3 top-3',
      className
    )}
  >
    {children}
  </div>
);
