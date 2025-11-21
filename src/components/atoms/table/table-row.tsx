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
        'TableRow-root border-steel-200 dark:border-dark-400 border-t',
        hoverStyle &&
          'hover:bg-steel-50 dark:hover:bg-dark-400 transition-colors duration-200',
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
