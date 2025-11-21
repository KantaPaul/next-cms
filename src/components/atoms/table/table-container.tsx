import { forwardRef, type Ref } from 'react';

import { cn } from '@/lib/utils/cn';

interface TableRootProps extends React.HTMLAttributes<HTMLDivElement> {
  tableClassName?: string;
}

export const TableContainer = forwardRef(
  ({ className, ...props }: TableRootProps, ref: Ref<HTMLDivElement>) => {
    return (
      <div
        ref={ref}
        className={cn(
          'Table-root overflow-x-auto',
          'relative z-10', // safari overlap fix
          className
        )}
        {...props}
      />
    );
  }
);
TableContainer.displayName = 'TableContainer';
