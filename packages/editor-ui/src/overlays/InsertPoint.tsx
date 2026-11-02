import { Plus } from 'lucide-react';
import React from 'react';
import { cn } from '../lib/cn';

/**
 * A round "+" at a point between items, for inserting there (B15 E6). Pops
 * in where it appears; the host decides what clicking it opens.
 */
export interface InsertPointProps {
  x: number;
  y: number;
  label?: string;
  line?: { left: number; width: number };
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
  className?: string;
  onMouseEnter?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  onMouseLeave?: (event: React.MouseEvent<HTMLButtonElement>) => void;
}

export const InsertPoint: React.FC<InsertPointProps> = ({
  x,
  y,
  label = 'Insert here',
  line,
  onClick,
  className,
  onMouseEnter,
  onMouseLeave,
}) => (
  <>
    {line && (
      <div
        aria-hidden
        style={{
          left: line.left,
          top: y - 1,
          width: line.width,
          height: 2,
        }}
        className="pointer-events-none absolute z-[44] bg-[var(--ne-primary)]/80 shadow-xs"
      />
    )}
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{ left: x - 11, top: y - 11 }}
      className={cn(
        'ne-motion-pop-in pointer-events-auto absolute z-[45] flex h-[22px] w-[22px] cursor-pointer items-center justify-center rounded-full bg-[var(--ne-primary)] text-white shadow-md transition-[scale,background-color] hover:scale-110 hover:bg-[var(--ne-primary-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ne-focus-ring)] active:scale-95',
        className
      )}
    >
      <Plus aria-hidden className="h-3.5 w-3.5" />
    </button>
  </>
);
