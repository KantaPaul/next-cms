import { cn } from '@/lib/utils/cn';

export function TableFoot({ children, ...props }: React.TableHTMLAttributes<HTMLTableElement>) {
  return (
    <tfoot
      className={cn(
        'TableFoot-root divide-y border-steel-200 text-left dark:divide-dark-300 dark:border-dark-300',
        props.className
      )}
    >
      {children}
    </tfoot>
  );
}
