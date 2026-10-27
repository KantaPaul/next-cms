'use client';

import { useId } from 'react';
import { Controller, type FieldPath, useFormContext } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { FormInput as Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  FormItem,
  FormMessage,
  useFormField,
} from '@/components/ui/form';
import { cn } from '@/lib/utils/cn';

interface TextFieldProps {
  name: string;
  label?: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  className?: string;
  disabled?: boolean;
}

/**
 * A text input field wired to react-hook-form via Controller.
 * Use inside a <form> managed by FormFactory or useForm.
 */
export function TextField({
  name,
  label,
  type = 'text',
  placeholder,
  required,
  className,
  disabled,
}: TextFieldProps) {
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
          <Input
            id={id}
            {...field}
            type={type}
            placeholder={placeholder}
            className={cn(className)}
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
