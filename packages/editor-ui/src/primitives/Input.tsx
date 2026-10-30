import React, { forwardRef } from 'react';

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  size?: 'sm' | 'md' | 'lg';
  leftElement?: React.ReactNode;
  rightElement?: React.ReactNode;
  error?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      size = 'md',
      leftElement,
      rightElement,
      error = false,
      className = '',
      disabled,
      ...props
    },
    ref
  ) => {
    const heightClass = {
      sm: 'h-6 text-xs',
      md: 'h-7 text-xs', // 28px standard compact
      lg: 'h-8 text-sm',
    }[size];

    return (
      <div
        className={`relative flex items-center w-full rounded-[var(--ne-radius-md)] border bg-[var(--ne-surface)] transition-all ${
          error
            ? 'border-[var(--ne-danger)] ring-1 ring-[var(--ne-danger)]'
            : 'border-[var(--ne-border)] focus-within:border-[var(--ne-primary)] focus-within:ring-1 focus-within:ring-[var(--ne-primary)]'
        } ${disabled ? 'opacity-50 cursor-not-allowed bg-[var(--ne-surface-subtle)]' : ''} ${className}`}
      >
        {leftElement && (
          <span className="pl-2 pr-1 text-[var(--ne-text-muted)] flex items-center shrink-0 pointer-events-none select-none text-xs">
            {leftElement}
          </span>
        )}
        <input
          ref={ref}
          disabled={disabled}
          className={`w-full bg-transparent px-2 text-[var(--ne-text)] placeholder-[var(--ne-text-subtle)] focus:outline-none disabled:cursor-not-allowed font-sans ${heightClass} ${
            leftElement ? 'pl-1' : ''
          } ${rightElement ? 'pr-1' : ''}`}
          {...props}
        />
        {rightElement && (
          <span className="pr-2 pl-1 text-[var(--ne-text-muted)] flex items-center shrink-0 text-xs">
            {rightElement}
          </span>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
