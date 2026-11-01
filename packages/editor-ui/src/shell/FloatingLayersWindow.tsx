import {
  GripHorizontal,
  Maximize2,
  Minimize2,
  PanelLeftClose,
  PanelRightClose,
  X,
} from 'lucide-react';
import React from 'react';
import { useEffect, useRef, useState } from 'react';
import { cn } from '../lib/cn';

export interface FloatingLayersWindowProps {
  title?: React.ReactNode;
  open?: boolean;
  onClose?: () => void;
  onDock?: (side: 'left' | 'right') => void;
  defaultPosition?: { x: number; y: number };
  defaultSize?: { width: number; height: number };
  children: React.ReactNode;
  className?: string;
}

export const FloatingLayersWindow: React.FC<FloatingLayersWindowProps> = ({
  title = 'Floating Window',
  open = true,
  onClose,
  onDock,
  defaultPosition = { x: 80, y: 80 },
  defaultSize = { width: 300, height: 420 },
  children,
  className,
}) => {
  const [pos, setPos] = useState(defaultPosition);
  const [size, setSize] = useState(defaultSize);
  const [isDragging, setIsDragging] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  const windowRef = useRef<HTMLDivElement>(null);

  // Esc key closes
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClose) {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const onHeaderPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    // Don't drag if clicking buttons
    if ((event.target as HTMLElement).closest('button')) return;

    event.preventDefault();
    const handle = event.currentTarget;
    handle.setPointerCapture(event.pointerId);
    setIsDragging(true);

    const startX = event.clientX;
    const startY = event.clientY;
    const startPosX = pos.x;
    const startPosY = pos.y;

    const onMove = (move: PointerEvent) => {
      setPos({
        x: Math.max(10, startPosX + (move.clientX - startX)),
        y: Math.max(10, startPosY + (move.clientY - startY)),
      });
    };

    const onUp = () => {
      setIsDragging(false);
      handle.removeEventListener('pointermove', onMove);
      handle.removeEventListener('pointerup', onUp);
      handle.removeEventListener('pointercancel', onUp);
    };

    handle.addEventListener('pointermove', onMove);
    handle.addEventListener('pointerup', onUp);
    handle.addEventListener('pointercancel', onUp);
  };

  if (!open) return null;

  return (
    <div
      ref={windowRef}
      role="dialog"
      aria-label={typeof title === 'string' ? title : 'Floating window'}
      style={{
        left: pos.x,
        top: pos.y,
        width: size.width,
        height: isMinimized ? 'auto' : size.height,
      }}
      className={cn(
        'ne-motion-enter fixed z-50 flex flex-col rounded-[var(--ne-radius-lg)] border border-[var(--ne-border-strong)] bg-[var(--ne-surface)] shadow-xl overflow-hidden',
        className
      )}
    >
      {/* Draggable Title Bar */}
      <div
        onPointerDown={onHeaderPointerDown}
        className={cn(
          'flex h-9 shrink-0 items-center justify-between border-b border-[var(--ne-border)] bg-[var(--ne-surface-subtle)] px-2 select-none touch-none',
          isDragging ? 'cursor-grabbing' : 'cursor-grab'
        )}
      >
        <div className="flex items-center gap-1.5 truncate">
          <GripHorizontal className="h-3.5 w-3.5 text-[var(--ne-text-muted)] shrink-0" />
          <span className="text-xs font-semibold text-[var(--ne-text)] truncate">
            {title}
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {onDock && (
            <>
              <button
                type="button"
                onClick={() => onDock('left')}
                aria-label="Dock to left"
                title="Dock to left"
                className="p-1 rounded text-[var(--ne-text-muted)] hover:bg-[var(--ne-surface-hover)] hover:text-[var(--ne-text)] transition-colors"
              >
                <PanelLeftClose size={13} />
              </button>
              <button
                type="button"
                onClick={() => onDock('right')}
                aria-label="Dock to right"
                title="Dock to right"
                className="p-1 rounded text-[var(--ne-text-muted)] hover:bg-[var(--ne-surface-hover)] hover:text-[var(--ne-text)] transition-colors"
              >
                <PanelRightClose size={13} />
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => setIsMinimized(m => !m)}
            aria-label={isMinimized ? 'Expand' : 'Minimize'}
            title={isMinimized ? 'Expand' : 'Minimize'}
            className="p-1 rounded text-[var(--ne-text-muted)] hover:bg-[var(--ne-surface-hover)] hover:text-[var(--ne-text)] transition-colors"
          >
            {isMinimized ? <Maximize2 size={13} /> : <Minimize2 size={13} />}
          </button>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              title="Close"
              className="p-1 rounded text-[var(--ne-text-muted)] hover:bg-[var(--ne-surface-hover)] hover:text-[var(--ne-danger)] transition-colors"
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {!isMinimized && (
        <div className="flex-1 overflow-auto ne-scrollbar min-h-0">
          {children}
        </div>
      )}
    </div>
  );
};
