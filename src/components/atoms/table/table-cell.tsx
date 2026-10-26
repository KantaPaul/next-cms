import { cn } from '@/lib/utils/cn';

interface TableCellProps
  extends React.TableHTMLAttributes<HTMLTableCellElement> {
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
        'TableCell-root whitespace-nowrap border-border border-r px-4 py-2.5 text-left align-middle text-sm text-foreground tabular-nums last:border-r-0',
        className
      )}
      {...rest}
    >
      {children}
    </td>
  );
}
