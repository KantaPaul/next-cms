import { cn } from '@/lib/utils/cn';

interface TableHeaderCellProps
  extends React.TableHTMLAttributes<HTMLTableCellElement> {
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
        'TableHeaderCell-root top-0 whitespace-nowrap border-border border-e px-4 py-2.5 text-start font-medium text-xs text-muted-foreground bg-muted/40 last:border-e-0',
        className
      )}
      {...rest}
    >
      {children}
    </th>
  );
}
