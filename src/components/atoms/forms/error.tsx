import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils/cn';

export const FieldError = ({
  error,
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { error: string }) => {
  if (!error) {
    return;
  }

  return (
    <span className={cn('mt-0.5 text-sm text-red-500', className)} {...props}>
      {error}
    </span>
  );
};
