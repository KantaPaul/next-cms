import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ClearButton({ ...props }) {
  return (
    <Button size="sm" variant="ghost" className="h-7 min-w-7 p-0" {...props}>
      <X className="size-4 text-steel-300 transition hover:text-steel-500 dark:text-dark-600 dark:hover:text-dark-800" />
      <span className="sr-only">Clear Input</span>
    </Button>
  );
}
