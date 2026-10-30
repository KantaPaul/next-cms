import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/cn';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--ne-radius-sm)] text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ne-primary)] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-[var(--ne-primary)] text-white hover:opacity-90',
        outline: 'border border-[var(--ne-border)] bg-[var(--ne-surface)] text-[var(--ne-text)] hover:bg-[var(--ne-bg)]',
        ghost: 'text-[var(--ne-text)] hover:bg-[var(--ne-bg)]',
        danger: 'bg-[var(--ne-danger)] text-white hover:opacity-90',
      },
      size: {
        sm: 'h-7 px-2.5 text-xs',
        default: 'h-8 px-3',
        lg: 'h-10 px-4',
        icon: 'h-8 w-8',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  )
);
Button.displayName = 'Button';

export { Button, buttonVariants };