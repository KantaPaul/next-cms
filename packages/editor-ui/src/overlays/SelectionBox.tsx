import React from 'react';
import { Lock, Move, ChevronUp, ChevronDown } from 'lucide-react';

export interface SelectionBoxProps {
  bounds: {
    top: number;
    left: number;
    width: number;
    height: number;
  };
  label?: string;
  locked?: boolean;
  isMoveMode?: boolean;
  onResizeStart?: (handle: string, e: React.MouseEvent) => void;
  showHandles?: boolean;
  className?: string;
}

export const SelectionBox: React.FC<SelectionBoxProps> = ({
  bounds,
  label,
  locked = false,
  isMoveMode = false,
  onResizeStart,
  showHandles = true,
  className = '',
}) => {
  const handles = [
    { id: 'nw', pos: '-top-1.5 -left-1.5 cursor-nwse-resize' },
    { id: 'n', pos: '-top-1.5 left-1/2 -translate-x-1/2 cursor-ns-resize' },
    { id: 'ne', pos: '-top-1.5 -right-1.5 cursor-nesw-resize' },
    { id: 'w', pos: 'top-1/2 -translate-y-1/2 -left-1.5 cursor-ew-resize' },
    { id: 'e', pos: 'top-1/2 -translate-y-1/2 -right-1.5 cursor-ew-resize' },
    { id: 'sw', pos: '-bottom-1.5 -left-1.5 cursor-nesw-resize' },
    { id: 's', pos: '-bottom-1.5 left-1/2 -translate-x-1/2 cursor-ns-resize' },
    { id: 'se', pos: '-bottom-1.5 -right-1.5 cursor-nwse-resize' },
  ];

  return (
    <div
      style={{
        top: `${bounds.top}px`,
        left: `${bounds.left}px`,
        width: `${bounds.width}px`,
        height: `${bounds.height}px`,
      }}
      className={`absolute pointer-events-none z-30 transition-all duration-75 border-2 ${
        locked
          ? 'border-[var(--ne-locked)] ring-2 ring-[var(--ne-locked)]/20'
          : isMoveMode
          ? 'border-[var(--ne-success)] ring-4 ring-[var(--ne-success)]/20 animate-pulse'
          : 'border-[var(--ne-select)] ring-2 ring-[var(--ne-primary)]/10'
      } ${className}`}
    >
      {/* Label Badge */}
      {label && (
        <div
          className={`absolute -top-6 left-0 px-1.5 py-0.5 text-[10px] font-sans font-medium rounded-t-[var(--ne-radius-sm)] flex items-center gap-1 text-white shadow-xs pointer-events-auto select-none ${
            locked
              ? 'bg-[var(--ne-warning)]'
              : isMoveMode
              ? 'bg-[var(--ne-success)]'
              : 'bg-[var(--ne-primary)]'
          }`}
        >
          {locked ? (
            <Lock className="w-2.5 h-2.5" />
          ) : isMoveMode ? (
            <Move className="w-2.5 h-2.5" />
          ) : null}
          <span className="truncate max-w-[120px]">{label}</span>
          {isMoveMode && (
            <span className="text-[9px] font-mono bg-black/20 px-1 rounded ml-1">
              Arrows: Move · Enter: Confirm
            </span>
          )}
        </div>
      )}

      {/* Resize Handles outside component markup */}
      {showHandles && !locked && !isMoveMode && (
        <>
          {handles.map((h) => (
            <div
              key={h.id}
              onMouseDown={(e) => {
                e.stopPropagation();
                onResizeStart?.(h.id, e);
              }}
              className={`absolute w-2.5 h-2.5 bg-white border-2 border-[var(--ne-primary)] rounded-[1px] shadow-xs pointer-events-auto ${h.pos}`}
            />
          ))}
        </>
      )}
    </div>
  );
};
