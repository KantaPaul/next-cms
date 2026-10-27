'use client';

import { useCallback } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  type DefaultValues,
  type FieldValues,
  FormProvider,
  type SubmitHandler,
  useForm,
} from 'react-hook-form';
import type { z } from 'zod';
import { cn } from '@/lib/utils/cn';

interface FormWrapperProps<TFieldValues extends FieldValues> {
  id?: string;
  className?: string;
  schema: z.ZodType<TFieldValues, any, any>;
  defaultValues?: DefaultValues<TFieldValues>;
  onSubmit: SubmitHandler<TFieldValues>;
  children: React.ReactNode;
  /** Reset the form to defaultValues after a successful submit. */
  resetOnSuccess?: boolean;
}

export function FormFactory<TFieldValues extends FieldValues>({
  id,
  children,
  onSubmit,
  defaultValues,
  schema,
  className,
  resetOnSuccess = true,
}: FormWrapperProps<TFieldValues>) {
  const methods = useForm<TFieldValues>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  const handleSubmit = useCallback(
    (data: TFieldValues) => {
      return onSubmit(data);
    },
    [onSubmit]
  );

  const reset = useCallback(() => {
    if (resetOnSuccess) {
      methods.reset(defaultValues);
    }
  }, [methods, resetOnSuccess, defaultValues]);

  return (
    <FormProvider {...methods}>
      <form
        id={id}
        onSubmit={methods.handleSubmit(handleSubmit)}
        className={cn('grid grid-cols-1 gap-7 lg:gap-10', className)}
        noValidate
        autoComplete="off"
      >
        {children}
      </form>
    </FormProvider>
  );
}
