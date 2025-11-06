import { cn } from '@/lib/utils/cn';
import type { HTMLAttributes } from 'react';

export function Text({ className, children, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn('text-steel-700 dark:text-dark-800 text-sm', className)}
      {...props}
    >
      {children}
    </p>
  );
}
