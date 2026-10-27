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

interface DateFieldProps {
  name: string;
  label?: string;
  required?: boolean;
  className?: string;
  disabled?: boolean;
}

/**
 * A date input field wired to react-hook-form via Controller.
 */
export function DateField({
  name,
  label,
  required,
  className,
  disabled,
}: DateFieldProps) {
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
          <input
            id={id}
            {...field}
            type="date"
            className={cn(
              'rounded-md border border-input bg-transparent p-2 text-sm w-full',
              className
            )}
            disabled={disabled}
            required={required}
          />
          {fieldState.error && (
            <FormMessage>{String(fieldState.error.message)}</FormMessage>
          )}
        </FormItem>
      )}
    />
  );
}
