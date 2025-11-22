import { Button, type ButtonProps } from '@/components/ui/button';
import { cn } from '@/lib/utils/cn';

export function ActionButton({ className, ...rest }: ButtonProps) {
  return (
    <Button
      variant="outline"
      className={cn(
        'dark:border-dark-400 gap-2 transition duration-300',
        className
      )}
      {...rest}
    />
  );
}

ActionButton.displayName = 'ActionButton';
