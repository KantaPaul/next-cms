'use client';

import * as React from 'react';
import { Checkbox as UiCheckbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils/cn';

export interface CheckBoxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  children?: React.ReactNode;
  className?: string;
  wrapperClassName?: string;
  labelClassName?: string;
  indeterminate?: boolean;
  description?: string;
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (e: any) => void;
  onCheckedChange?: (checked: boolean | 'indeterminate') => void;
}

export const Checkbox = React.forwardRef<HTMLButtonElement, CheckBoxProps>(
  (
    {
      className,
      wrapperClassName,
      children,
      indeterminate,
      labelClassName,
      description,
      id: providedId,
      checked,
      defaultChecked,
      disabled,
      required,
      onChange,
      onCheckedChange,
      'aria-describedby': ariaDescribedBy,
      ...rest
    },
    ref
  ) => {
    const generatedId = React.useId();
    const checkboxId = providedId || generatedId;
    const descriptionId = `${checkboxId}-description`;

    const handleCheckedChange = (isChecked: boolean | 'indeterminate') => {
      onCheckedChange?.(isChecked);
      if (onChange) {
        const syntheticEvent = {
          target: {
            checked: isChecked === true,
            type: 'checkbox',
            id: checkboxId,
          },
          currentTarget: {
            checked: isChecked === true,
            type: 'checkbox',
            id: checkboxId,
          },
          stopPropagation: () => {},
          preventDefault: () => {},
        };
        onChange(syntheticEvent);
      }
    };

    const resolvedChecked = indeterminate ? 'indeterminate' : checked;

    return (
      <div className={cn('inline-flex items-center gap-2', wrapperClassName)}>
        <UiCheckbox
          ref={ref}
          id={checkboxId}
          disabled={disabled}
          required={required}
          checked={resolvedChecked}
          defaultChecked={defaultChecked}
          onCheckedChange={handleCheckedChange}
          aria-describedby={description ? descriptionId : ariaDescribedBy}
          className={className}
        />
        {children && (
          <label
            htmlFor={checkboxId}
            className={cn(
              'cursor-pointer select-none text-sm font-medium leading-none text-foreground peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
              labelClassName
            )}
          >
            {children}
          </label>
        )}
        {description && (
          <span id={descriptionId} className="sr-only">
            {description}
          </span>
        )}
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';