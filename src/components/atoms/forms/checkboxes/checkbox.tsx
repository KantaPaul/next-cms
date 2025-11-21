'use client';

import { forwardRef, useId } from 'react';

import { cn } from '@/lib/utils/cn';

interface CheckBoxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  children?: React.ReactNode;
  className?: string;
  wrapperClassName?: string;
  labelClassName?: string;
  indeterminate?: boolean;
  description?: string; // Optional additional description for screen readers
}

const Checkbox = forwardRef<HTMLInputElement, CheckBoxProps>(
  (
    {
      className,
      wrapperClassName,
      children,
      indeterminate,
      labelClassName,
      description,
      id: providedId,
      'aria-describedby': ariaDescribedBy,
      ...rest
    },
    ref
  ) => {
    // Generate a unique ID if not provided
    const generatedId = useId();
    const checkboxId = providedId || generatedId;
    const descriptionId = `${checkboxId}-description`;

    return (
      <div className={cn('flex items-center', wrapperClassName)}>
        <label
          htmlFor={checkboxId}
          className={cn(
            'checkbox-component group flex w-auto shrink-0 cursor-pointer items-center justify-start text-sm transition-all',

            className
          )}
        >
          <input
            ref={ref}
            id={checkboxId}
            type="checkbox"
            className="checkbox-input peer -z-1 invisible absolute opacity-0"
            aria-checked={indeterminate ? 'mixed' : rest.checked}
            aria-invalid={rest.required && !rest.checked ? 'true' : 'false'}
            aria-describedby={description ? descriptionId : ariaDescribedBy}
            {...rest}
          />
          <span
            tabIndex={0}
            className={cn(
              'checkbox_box relative h-[20px] w-[20px] shrink-0 cursor-pointer rounded border-2 border-steel-100 transition duration-300 dark:border-dark-400',
              // focus
              'outline-steel-200 outline-offset-4 focus:outline-1',
              { indeterminate }
            )}
            role="checkbox"
            aria-checked={rest.checked}
            aria-hidden="true"
          />
          {children && (
            <span
              className={cn(
                'ml-2 text-steel-700 dark:text-dark-800/80 peer-disabled:dark:text-white/40',
                labelClassName
              )}
            >
              {children}
            </span>
          )}
        </label>
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

export { Checkbox };