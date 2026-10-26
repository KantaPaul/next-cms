import { cn } from '@/lib/utils/cn';

export function TableBody({
  children,
  ...props
}: React.TableHTMLAttributes<HTMLTableElement>) {
  return (
    <tbody className={cn('TableBody-root align-top', props.className)}>
      {children}
    </tbody>
  );
}
