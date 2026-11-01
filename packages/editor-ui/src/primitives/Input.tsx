import { Input as InputPrimitive } from '@base-ui/react/input';
import * as React from 'react';
import { cn } from '../lib/cn';

export interface InputProps extends React.ComponentProps<'input'> {
  leftElement?: React.ReactNode;
  rightElement?: React.ReactNode;
}

function Input({
  className,
  type,
  leftElement,
  rightElement,
  ...props
}: InputProps) {
  if (leftElement || rightElement) {
    return (
      <div className="relative flex items-center w-full">
        {leftElement && (
          <div className="absolute left-2.5 flex items-center pointer-events-none text-muted-foreground">
            {leftElement}
          </div>
        )}
        <InputPrimitive
          type={type}
          data-slot="input"
          className={cn(
            'h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40',
            leftElement && 'pl-8',
            rightElement && 'pr-8',
            className
          )}
          {...props}
        />
        {rightElement && (
          <div className="absolute right-2.5 flex items-center pointer-events-none text-muted-foreground">
            {rightElement}
          </div>
        )}
      </div>
    );
  }

  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        'h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40',
        className
      )}
      {...props}
    />
  );
}

export { Input };
