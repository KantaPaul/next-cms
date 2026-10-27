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

interface TextareaFieldProps {
  name: string;
  label?: string;
  placeholder?: string;
  required?: boolean;
  rows?: number;
  className?: string;
  disabled?: boolean;
}

/**
 * A textarea field wired to react-hook-form via Controller.
 */
export function TextareaField({
  name,
  label,
  placeholder,
  required,
  rows,
  className,
  disabled,
}: TextareaFieldProps) {
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
          <textarea
            id={id}
            {...field}
            placeholder={placeholder}
            rows={rows}
            className={cn(
              'border-input bg-transparent flex field-sizing-content min-h-16 w-full rounded-md border shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
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
