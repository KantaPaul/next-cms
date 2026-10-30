import * as React from 'react';
import { cn } from '../lib/cn';

export interface ResizeHandlesProps {
  onResizeStart?: (
    edge: 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw'
  ) => void;
  visible?: boolean;
  className?: string;
}

const edges: Array<{
  edge: 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';
  className: string;
  cursor: string;
}> = [
  {
    edge: 'n',
    className: 'top-0 left-1/2 -translate-x-1/2 h-2 w-8',
    cursor: 'ns-resize',
  },
  {
    edge: 's',
    className: 'bottom-0 left-1/2 -translate-x-1/2 h-2 w-8',
    cursor: 'ns-resize',
  },
  {
    edge: 'e',
    className: 'right-0 top-1/2 -translate-y-1/2 h-8 w-2',
    cursor: 'ew-resize',
  },
  {
    edge: 'w',
    className: 'left-0 top-1/2 -translate-y-1/2 h-8 w-2',
    cursor: 'ew-resize',
  },
  { edge: 'ne', className: 'top-0 right-0 h-3 w-3', cursor: 'nesw-resize' },
  { edge: 'nw', className: 'top-0 left-0 h-3 w-3', cursor: 'nwse-resize' },
  { edge: 'se', className: 'bottom-0 right-0 h-3 w-3', cursor: 'nwse-resize' },
  { edge: 'sw', className: 'bottom-0 left-0 h-3 w-3', cursor: 'nesw-resize' },
];

export function ResizeHandles({
  onResizeStart,
  visible = true,
  className,
}: ResizeHandlesProps) {
  if (!visible) return null;
  return (
    <div className={cn('absolute inset-0 pointer-events-none', className)}>
      {edges.map(({ edge, className: cls, cursor }) => (
        <div
          key={edge}
          className={cn(
            'absolute pointer-events-auto rounded-sm bg-[var(--ne-primary)]',
            cls
          )}
          style={{ cursor }}
          onPointerDown={e => {
            e.preventDefault();
            e.stopPropagation();
            onResizeStart?.(edge as any);
          }}
        />
      ))}
    </div>
  );
}
