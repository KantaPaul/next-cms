import { cn } from '@/lib/utils/cn';

interface TableRowProps extends React.TableHTMLAttributes<HTMLTableRowElement> {
  hoverStyle?: boolean;
}

export function TableRow({
  children,
  className,
  onClick,
  hoverStyle = true,
  ...props
}: TableRowProps) {
  return (
    <tr
      className={cn(
        'TableRow-root border-border border-t transition-colors',
        hoverStyle && 'hover:bg-muted/50 data-[state=selected]:bg-muted',
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
      {...props}
    >
      {children}
    </tr>
  );
}
