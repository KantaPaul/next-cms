import { cn } from '@/lib/utils/cn';

function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        'animate-pulse rounded-md bg-zinc-900/10 dark:bg-zinc-50/10',
        className
      )}
      {...props}
    />
  );
}

export { Skeleton };
