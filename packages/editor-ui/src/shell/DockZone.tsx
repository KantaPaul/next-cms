import React from 'react';
import { cn } from '../lib/cn';

export type DockPosition = 'left' | 'right' | 'bottom' | 'float';

export interface DockZoneProps {
  position: DockPosition;
  isOver?: boolean;
  canDrop?: boolean;
  onDockChange?: (newPosition: DockPosition) => void;
  children: React.ReactNode;
  className?: string;
}

export const DockZone: React.FC<DockZoneProps> = ({
  position,
  isOver = false,
  canDrop = false,
  onDockChange,
  children,
  className,
}) => {
  return (
    <div
      data-dock-position={position}
      className={cn(
        'relative flex min-h-0 min-w-0 transition-all',
        position === 'left' && 'h-full border-e border-[var(--ne-border)]',
        position === 'right' && 'h-full border-s border-[var(--ne-border)]',
        position === 'bottom' && 'w-full border-t border-[var(--ne-border)]',
        position === 'float' && 'absolute z-40',
        isOver && canDrop && 'ring-2 ring-[var(--ne-primary)] ring-inset bg-[var(--ne-primary-soft)]/20',
        className
      )}
    >
      {children}
    </div>
  );
};
