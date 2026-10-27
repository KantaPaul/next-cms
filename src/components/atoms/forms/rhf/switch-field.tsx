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

interface SwitchFieldProps {
  name: string;
  label?: string;
  required?: boolean;
  className?: string;
  disabled?: boolean;
}

/**
 * A switch/toggle field wired to react-hook-form via Controller.
 */
export function SwitchField({
  name,
  label,
  required,
  className,
  disabled,
}: SwitchFieldProps) {
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
            role="switch"
            className="peer shrink-0 round bg-border after:absolute after:inset-0 after:rounded-full after:bg-current after:opacity-30 after:transition-colors checked:bg-primary after:checked:translate-x-full after:checked:bg-primary after:checked:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:after:opacity-100 data-[state=unchecked]:bg-input"
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
