import React from 'react';
import { useCallback, useRef, useState } from 'react';
import { cn } from '../lib/cn';

export interface PanelResizeDividerProps {
  orientation?: 'vertical' | 'horizontal';
  onResize?: (delta: number) => void;
  onResizeEnd?: () => void;
  min?: number;
  max?: number;
  value?: number;
  ariaLabel?: string;
  className?: string;
}

const STEP = 8;
const STEP_LARGE = 40;

export const PanelResizeDivider: React.FC<PanelResizeDividerProps> = ({
  orientation = 'vertical',
  onResize,
  onResizeEnd,
  min,
  max,
  value,
  ariaLabel = 'Resize panel',
  className,
}) => {
  const [resizing, setResizing] = useState(false);
  const dividerRef = useRef<HTMLDivElement>(null);

  const isVertical = orientation === 'vertical';

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || !onResize) return;
    event.preventDefault();
    const handle = event.currentTarget;
    handle.setPointerCapture(event.pointerId);
    setResizing(true);

    let lastCoord = isVertical ? event.clientX : event.clientY;

    const onMove = (move: PointerEvent) => {
      const currentCoord = isVertical ? move.clientX : move.clientY;
      const delta = currentCoord - lastCoord;
      lastCoord = currentCoord;
      onResize(delta);
    };

    const onUp = () => {
      setResizing(false);
      handle.removeEventListener('pointermove', onMove);
      handle.removeEventListener('pointerup', onUp);
      handle.removeEventListener('pointercancel', onUp);
      onResizeEnd?.();
    };

    handle.addEventListener('pointermove', onMove);
    handle.addEventListener('pointerup', onUp);
    handle.addEventListener('pointercancel', onUp);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!onResize) return;
    const step = event.shiftKey ? STEP_LARGE : STEP;

    if (isVertical) {
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        onResize(step);
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        onResize(-step);
      }
    } else {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        onResize(step);
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        onResize(-step);
      }
    }
  };

  return (
    <div
      ref={dividerRef}
      role="separator"
      tabIndex={0}
      aria-orientation={orientation}
      aria-label={ariaLabel}
      aria-valuenow={value}
      aria-valuemin={min}
      aria-valuemax={max}
      onPointerDown={onPointerDown}
      onKeyDown={onKeyDown}
      title="Drag or use arrow keys to resize"
      className={cn(
        'group relative touch-none select-none transition-colors focus-visible:outline-none',
        isVertical
          ? 'w-1.5 cursor-col-resize hover:bg-[var(--ne-primary)]/20 focus-visible:bg-[var(--ne-primary)]/30'
          : 'h-1.5 cursor-row-resize hover:bg-[var(--ne-primary)]/20 focus-visible:bg-[var(--ne-primary)]/30',
        resizing && 'bg-[var(--ne-primary)]/30',
        className
      )}
    >
      {/* Visual thin line indicator centered in handle */}
      <div
        className={cn(
          'absolute transition-colors',
          isVertical
            ? 'inset-y-0 start-1/2 -translate-x-1/2 w-[1px] bg-[var(--ne-border)] group-hover:bg-[var(--ne-primary)]'
            : 'inset-x-0 top-1/2 -translate-y-1/2 h-[1px] bg-[var(--ne-border)] group-hover:bg-[var(--ne-primary)]'
        )}
      />
    </div>
  );
};
