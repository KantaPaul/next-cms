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
        'TableCell-root whitespace-nowrap border-border border-e px-4 py-2.5 text-start align-middle text-sm text-foreground tabular-nums last:border-e-0',
        className
      )}
      {...rest}
    >
      {children}
    </td>
  );
}
