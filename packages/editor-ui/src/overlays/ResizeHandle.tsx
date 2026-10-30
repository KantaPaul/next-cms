import type React from 'react';
import { cn } from '../lib/cn';

/**
 * One resize grip on an edge of a box (B15 E5). Pure presentation: the host
 * owns the value, the pointer drag and the keyboard steps; this draws the
 * grip (a slider for assistive tech) and, while active, a value badge.
 */
export interface ResizeHandleProps {
  edge: 'right' | 'bottom';
  /** The box the handle sits on, in the overlay's coordinates. */
  rect: { top: number; left: number; width: number; height: number };
  label: string;
  /** Formatted value, e.g. "48px" or "auto". */
  valueText: string;
  value?: number;
  min?: number;
  max?: number;
  /** True while dragging: shows the value badge. */
  active?: boolean;
  onPointerDown?: (event: React.PointerEvent<HTMLButtonElement>) => void;
  onKeyDown?: (event: React.KeyboardEvent<HTMLButtonElement>) => void;
  className?: string;
}

export const ResizeHandle: React.FC<ResizeHandleProps> = ({
  edge,
  rect,
  label,
  valueText,
  value,
  min,
  max,
  active = false,
  onPointerDown,
  onKeyDown,
  className,
}) => {
  const right = edge === 'right';
  // Inside the edge, so a full-width box's handle is not clipped by the canvas.
  const grip: React.CSSProperties = right
    ? {
        left: rect.left + rect.width - 12,
        top: rect.top + rect.height / 2 - 14,
        width: 10,
        height: 28,
      }
    : {
        left: rect.left + rect.width / 2 - 14,
        top: rect.top + rect.height - 12,
        width: 28,
        height: 10,
      };
  const badge: React.CSSProperties = right
    ? {
        left: rect.left + rect.width - 72,
        top: rect.top + rect.height / 2 - 11,
      }
    : {
        left: rect.left + rect.width / 2 + 18,
        top: rect.top + rect.height - 11,
      };
  return (
    <>
      <button
        type="button"
        role="slider"
        aria-label={label}
        aria-valuenow={value}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuetext={valueText}
        aria-orientation={right ? 'horizontal' : 'vertical'}
        title={`${label}: ${valueText}. Drag, or use the arrow keys.`}
        onPointerDown={onPointerDown}
        onKeyDown={onKeyDown}
        style={grip}
        className={cn(
          'ne-motion-follow pointer-events-auto absolute z-[3] box-border touch-none rounded-[5px] border-2 border-[var(--ne-select)] bg-white shadow-xs transition-[scale] hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ne-focus-ring)]',
          right ? 'cursor-ew-resize' : 'cursor-ns-resize',
          active && 'scale-110 bg-[var(--ne-primary-soft)]',
          className
        )}
      />
      {active && (
        <div
          aria-hidden
          style={badge}
          className="ne-motion-pop-in pointer-events-none absolute z-[3] rounded-[var(--ne-radius-sm)] bg-[var(--ne-select)] px-1.5 py-0.5 font-mono text-[11px] font-semibold text-white shadow-sm"
        >
          {valueText}
        </div>
      )}
    </>
  );
};
