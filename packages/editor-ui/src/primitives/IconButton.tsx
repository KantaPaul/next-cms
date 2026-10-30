import React, { forwardRef } from 'react';
import { Tooltip } from './Tooltip';

export interface IconButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  active?: boolean;
  tooltip?: string;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      variant = 'ghost',
      size = 'md',
      active = false,
      tooltip,
      className = '',
      children,
      disabled,
      title,
      ...props
    },
    ref
  ) => {
    const sizeClasses = {
      sm: 'w-6 h-6 p-1 rounded-[var(--ne-radius-sm)]',
      md: 'w-7 h-7 p-1 rounded-[var(--ne-radius-md)]', // 28px
      lg: 'w-8 h-8 p-1.5 rounded-[var(--ne-radius-md)]',
    }[size];

    const variantClasses = {
      primary: active
        ? 'bg-[var(--ne-primary-hover)] text-white'
        : 'bg-[var(--ne-primary)] text-white hover:bg-[var(--ne-primary-hover)]',
      secondary: active
        ? 'bg-[var(--ne-primary-soft)] text-[var(--ne-primary)] border-[var(--ne-primary)]'
        : 'bg-[var(--ne-surface)] text-[var(--ne-text)] hover:bg-[var(--ne-surface-hover)] border border-[var(--ne-border)]',
      ghost: active
        ? 'bg-[var(--ne-primary-soft)] text-[var(--ne-primary)] font-medium'
        : 'bg-transparent text-[var(--ne-text-muted)] hover:text-[var(--ne-text)] hover:bg-[var(--ne-surface-hover)]',
      danger:
        'bg-transparent text-[var(--ne-danger)] hover:bg-[var(--ne-danger-soft)]',
    }[variant];

    const button = (
      <button
        ref={ref}
        disabled={disabled}
        title={tooltip ? undefined : title}
        aria-label={props['aria-label'] ?? tooltip}
        className={`inline-flex items-center justify-center transition-[color,background-color,scale] duration-150 cursor-pointer select-none active:scale-90 disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ne-focus-ring)] shrink-0 ${sizeClasses} ${variantClasses} ${className}`}
        {...props}
      >
        {children}
      </button>
    );
    // A real tooltip (Radix): shows on hover and keyboard focus, animated.
    return tooltip ? <Tooltip content={tooltip}>{button}</Tooltip> : button;
  }
);

IconButton.displayName = 'IconButton';
