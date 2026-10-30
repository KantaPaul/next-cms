import React, { forwardRef } from 'react';

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'secondary',
      size = 'md',
      leftIcon,
      rightIcon,
      fullWidth = false,
      className = '',
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const sizeClasses = {
      sm: 'h-6 px-2 text-xs gap-1 rounded-[var(--ne-radius-sm)]',
      md: 'h-7 px-2.5 text-xs gap-1.5 rounded-[var(--ne-radius-md)]', // 28px standard compact
      lg: 'h-8 px-3 text-sm gap-2 rounded-[var(--ne-radius-md)]',
    }[size];

    const variantClasses = {
      primary:
        'bg-[var(--ne-primary)] text-white hover:bg-[var(--ne-primary-hover)] border border-transparent shadow-xs font-medium',
      secondary:
        'bg-[var(--ne-surface)] text-[var(--ne-text)] hover:bg-[var(--ne-surface-hover)] border border-[var(--ne-border)] font-normal',
      ghost:
        'bg-transparent text-[var(--ne-text)] hover:bg-[var(--ne-surface-hover)] border border-transparent font-normal',
      outline:
        'bg-transparent text-[var(--ne-text)] hover:bg-[var(--ne-surface-hover)] border border-[var(--ne-border)] font-normal',
      danger:
        'bg-[var(--ne-danger)] text-white hover:opacity-90 border border-transparent shadow-xs font-medium',
    }[variant];

    return (
      <button
        ref={ref}
        disabled={disabled}
        className={`inline-flex items-center justify-center font-sans tracking-tight transition-all duration-150 select-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-inherit focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ne-focus-ring)] focus-visible:ring-offset-1 shrink-0 ${sizeClasses} ${variantClasses} ${fullWidth ? 'w-full' : ''} ${className}`}
        {...props}
      >
        {leftIcon && (
          <span className="shrink-0 flex items-center justify-center">
            {leftIcon}
          </span>
        )}
        {children && <span className="truncate leading-none">{children}</span>}
        {rightIcon && (
          <span className="shrink-0 flex items-center justify-center">
            {rightIcon}
          </span>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
