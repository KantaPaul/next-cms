import * as React from 'react';
import { cn } from '../lib/cn';

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('animate-pulse rounded-[var(--ne-radius-sm)] bg-[var(--ne-border)]', className)}
      {...props}
    />
  );
}

export { Skeleton };