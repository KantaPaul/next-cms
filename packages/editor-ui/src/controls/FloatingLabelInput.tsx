import React, { useId, useState } from 'react';
import { cn } from '../lib/cn';
import { Input } from '../primitives/Input';

export interface FloatingLabelInputProps {
  id?: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: 'text' | 'url';
  placeholder?: string;
  readOnly?: boolean;
  disabled?: boolean;
  className?: string;
}

/**
 * Floating-label text input for inspector fields. The label rests inside the
 * field and lifts into the top border on focus or when filled. A placeholder
 * shows only while lifted.
 */
export const FloatingLabelInput: React.FC<FloatingLabelInputProps> = ({
  id,
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  readOnly,
  disabled,
  className,
}) => {
  const generated = useId();
  const fieldId = id ?? generated;
  const [focused, setFocused] = useState(false);
  const filled = value != null && String(value).length > 0;
  const lifted = focused || filled;

  return (
    <div className={cn('relative', className)}>
      <Input
        id={fieldId}
        type={type}
        value={value ?? ''}
        placeholder={lifted ? placeholder : undefined}
        readOnly={readOnly}
        disabled={disabled}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onChange={e => onChange(e.target.value)}
        className={cn(
          'peer h-9 pt-3 pb-1',
          // keep space for lifted label
          lifted ? '' : ''
        )}
      />
      <label
        htmlFor={fieldId}
        className={cn(
          'pointer-events-none absolute start-2.5 rtl:origin-right transition-all duration-[var(--ne-duration-fast)] ease-[var(--ne-easing)] text-[var(--ne-text-muted)]',
          lifted
            ? '-top-2 scale-90 bg-[var(--ne-surface,white)] px-1 text-[10px] text-[var(--ne-primary)]'
            : 'top-1/2 -translate-y-1/2 text-xs'
        )}
      >
        {label}
      </label>
    </div>
  );
};
