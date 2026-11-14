import { cn } from '@/lib/utils/cn';

export function TableHead({
  children,
  ...props
}: React.TableHTMLAttributes<HTMLTableElement>) {
  return (
    <thead className={cn('TableHead-root text-start', props.className)}>
      {children}
    </thead>
  );
}
