import * as React from 'react';
import { cn } from '../lib/cn';

export interface StatusBarProps {
  left?: React.ReactNode;
  center?: React.ReactNode;
  right?: React.ReactNode;
  className?: string;
}

export function StatusBar({ left, center, right, className }: StatusBarProps) {
  return (
    <div
      className={cn(
        'flex h-6 items-center justify-between gap-2 px-3 text-xs text-[var(--ne-text-muted)]',
        className
      )}
    >
      <div className="flex items-center gap-2">{left}</div>
      <div className="flex items-center gap-2">{center}</div>
      <div className="flex items-center gap-2">{right}</div>
    </div>
  );
}