import type React from 'react';
import { cn } from '../lib/cn';

/**
 * Bottom status strip (B15 E3). Three generic slots; builders put their own
 * breadcrumb, counts, zoom, or hints in them.
 */
export interface StatusBarProps {
  left?: React.ReactNode;
  center?: React.ReactNode;
  right?: React.ReactNode;
  className?: string;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  left,
  center,
  right,
  className,
}) => (
  <footer
    className={cn(
      'z-30 flex h-7 shrink-0 select-none items-center justify-between gap-4 border-t border-[var(--ne-border)] bg-[var(--ne-surface)] px-3 text-[11px] text-[var(--ne-text-muted)]',
      className
    )}
  >
    <div className="flex min-w-0 items-center gap-2">{left}</div>
    <div className="hidden items-center gap-2 text-[10px] text-[var(--ne-text-subtle)] lg:flex">
      {center}
    </div>
    <div className="flex shrink-0 items-center gap-3 tabular-nums">{right}</div>
  </footer>
);
