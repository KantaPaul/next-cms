import React, { forwardRef } from 'react';
import { ChevronDown } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  options: SelectOption[];
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(({
  options,
  size = 'md',
  fullWidth = true,
  className = '',
  disabled,
  ...props
}, ref) => {
  const heightClass = {
    sm: 'h-6 text-xs pl-2 pr-6',
    md: 'h-7 text-xs pl-2.5 pr-7', // 28px standard compact
    lg: 'h-8 text-sm pl-3 pr-8',
  }[size];

  return (
    <div className={`relative inline-block ${fullWidth ? 'w-full' : ''}`}>
      <select
        ref={ref}
        disabled={disabled}
        className={`w-full appearance-none rounded-[var(--ne-radius-md)] border border-[var(--ne-border)] bg-[var(--ne-surface)] text-[var(--ne-text)] font-sans transition-all focus:border-[var(--ne-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--ne-primary)] disabled:cursor-not-allowed disabled:opacity-50 ${heightClass} ${className}`}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} disabled={opt.disabled} className="bg-[var(--ne-surface)] text-[var(--ne-text)]">
            {opt.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--ne-text-muted)]" />
    </div>
  );
});

Select.displayName = 'Select';
