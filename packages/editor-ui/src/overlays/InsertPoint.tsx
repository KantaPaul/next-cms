import { Plus } from 'lucide-react';
import type React from 'react';
import { cn } from '../lib/cn';

/**
 * A round "+" at a point between items, for inserting there (B15 E6). Pops
 * in where it appears; the host decides what clicking it opens.
 */
export interface InsertPointProps {
  x: number;
  y: number;
  label?: string;
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
  className?: string;
}

export const InsertPoint: React.FC<InsertPointProps> = ({
  x,
  y,
  label = 'Insert here',
  onClick,
  className,
}) => (
  <button
    type="button"
    aria-label={label}
    title={label}
    onClick={onClick}
    style={{ left: x - 11, top: y - 11 }}
    className={cn(
      'ne-motion-pop-in pointer-events-auto absolute z-[3] flex h-[22px] w-[22px] cursor-pointer items-center justify-center rounded-full bg-[var(--ne-primary)] text-white shadow-md transition-[scale,background-color] hover:scale-110 hover:bg-[var(--ne-primary-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ne-focus-ring)] active:scale-95',
      className
    )}
  >
    <Plus aria-hidden className="h-3.5 w-3.5" />
  </button>
);
