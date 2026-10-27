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

interface CheckboxFieldProps {
  name: string;
  label?: string;
  required?: boolean;
  className?: string;
  disabled?: boolean;
}

/**
 * A checkbox field wired to react-hook-form via Controller.
 */
export function CheckboxField({
  name,
  label,
  required,
  className,
  disabled,
}: CheckboxFieldProps) {
  const { getFieldState } = useFormContext();
  const fieldState = getFieldState(name as FieldPath<any>);
  const id = useId();

  return (
    <Controller
      name={name as string}
      render={({ field }) => (
        <FormItem className={cn('flex items-center gap-2', className)}>
          <input
            id={id}
            {...field}
            type="checkbox"
            className="peer group size-4 shrink-0 rounded-[4px] border border-input shadow-xs transition-shadow outline-none focus-visible:border-ring focus-visible:ring-[3px] data-[state=checked]:border-primary data-[state=checked]:bg-primary disabled:cursor-not-allowed disabled:opacity-50"
            disabled={disabled}
            required={required}
          />
          {label && <Label htmlFor={id}>{label}{required ? ' *' : ''}</Label>}
          {fieldState.error && (
            <FormMessage>{String(fieldState.error.message)}</FormMessage>
          )}
        </FormItem>
      )}
    />
  );
}
