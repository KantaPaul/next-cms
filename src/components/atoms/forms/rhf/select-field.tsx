'use client';

import { useId } from 'react';
import { Controller, type FieldPath, useFormContext } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import {
  FormItem,
  FormMessage,
  useFormField,
} from '@/components/ui/form';
import { cn } from '@/lib/utils/cn';

interface SelectFieldProps<T extends string = string> {
  name: string;
  label?: string;
  options: { value: T; label: string }[];
  placeholder?: string;
  required?: boolean;
  className?: string;
  disabled?: boolean;
}

/**
 * A select field wired to react-hook-form via Controller.
 */
export function SelectField<T extends string = string>({
  name,
  label,
  options,
  placeholder,
  required,
  className,
  disabled,
}: SelectFieldProps<T>) {
  const { getFieldState } = useFormContext();
  const fieldState = getFieldState(name as FieldPath<any>);
  const id = useId();

  return (
    <Controller
      name={name as string}
      render={({ field }) => (
        <FormItem>
          {label && (
            <Label htmlFor={id}>{label}{required ? ' *' : ''}</Label>
          )}
          <select
            id={id}
            {...field}
            className={cn(
              'rounded-md border border-input bg-transparent p-2 text-sm w-full',
              className
            )}
            disabled={disabled}
            required={required}
          >
            {placeholder ? (
              <option value="" disabled>
                {placeholder}
              </option>
            ) : null}
            {options.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {fieldState.error && (
            <FormMessage>{String(fieldState.error.message)}</FormMessage>
          )}
        </FormItem>
      )}
    />
  );
}
