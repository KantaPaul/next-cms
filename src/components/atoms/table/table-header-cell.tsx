import { cn } from '@/lib/utils/cn';

interface TableHeaderCellProps extends React.TableHTMLAttributes<HTMLTableCellElement> {
  colSpan?: number;
  rowSpan?: number;
}

export function TableHeaderCell({ children, ...props }: TableHeaderCellProps) {
  const { className, colSpan, rowSpan, ...rest } = props;
  return (
    <th
      colSpan={colSpan}
      rowSpan={rowSpan}
      className={cn(
        'TableHeaderCell-root top-0 whitespace-nowrap border-steel-200 border-r px-4 py-2 text-left font-geist-mono font-medium text-sm text-steel-400 last:border-r-0 dark:border-dark-300 dark:text-dark-600',
        className
      )}
      {...rest}
    >
      {children}
    </th>
  );
}
