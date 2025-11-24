import { cn } from '@/lib/utils/cn';

interface DividerProps {
  className?: string;
}

export function Divider({ className }: DividerProps) {
  return (
    <hr className={cn('border-steel-200/80 border-dashed dark:border-steel-600/50', className)} />
  );
}
