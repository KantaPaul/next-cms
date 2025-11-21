import { forwardRef } from 'react';

import { cn } from '@/lib/utils/cn';

interface TableProps extends React.HTMLAttributes<HTMLTableElement> {
  className?: string;
}

export const TableRoot = forwardRef<HTMLTableElement, TableProps>(({ className, ...rest }, ref) => {
  return (
    <table
      ref={ref}
      className={cn(
        'Table-table w-full table-fixed border-spacing-0 border-steel-200 border-y dark:border-steel-600',
        className
      )}
      {...rest}
    />
  );
});
TableRoot.displayName = 'TableRoot';
