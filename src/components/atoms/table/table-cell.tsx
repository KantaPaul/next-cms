import { cn } from '@/lib/utils/cn';

interface TableCellProps extends React.TableHTMLAttributes<HTMLTableCellElement> {
  title?: string;
  colSpan?: number;
}

export function TableCell({ children, colSpan, ...props }: TableCellProps) {
  const { className, title, ...rest } = props;
  return (
    <td
      title={title}
      colSpan={colSpan}
      className={cn(
        // border-r border-steel-200 last:border-r-0 dark:border-dark-300
        'TableCell-root whitespace-nowrap border-steel-200 border-r px-4 py-2 text-left align-middle text-sm text-steel-700 tabular-nums last:border-r-0 dark:border-dark-300 dark:text-dark-800',
        className
      )}
      {...rest}
    >
      {children}
    </td>
  );
}
