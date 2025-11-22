import { ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function DropdownIndicator({ ...props }) {
  return (
    <Button size="sm" variant="ghost" className="h-7 min-w-7 p-0" {...props}>
      <ChevronsUpDown
        strokeWidth={1.8}
        className="size-[18px] text-steel-300 transition hover:text-steel-500 dark:text-dark-600 dark:hover:text-dark-800"
      />
      <span className="sr-only">Open calendar</span>
    </Button>
  );
}
