'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  type DefaultValues,
  type FieldPathValues,
  type FieldValues,
  // type UseFormReturn,
  FormProvider,
  type SubmitHandler,
  useForm,
  useWatch,
} from 'react-hook-form';
import type { z } from 'zod';
import { cn } from '@/lib/utils/cn';

interface FormWrapperProps<TFieldValues extends FieldValues> {
  id?: string;
  className?: string;
  schema: z.ZodType<TFieldValues, any, any>;
  defaultValues?: DefaultValues<TFieldValues>;
  values?: Partial<TFieldValues>;
  onSubmit: SubmitHandler<TFieldValues>;
  // children: (form: UseFormReturn<TFieldValues>) => React.ReactNode;
  children: React.ReactNode;
}

export function FormFactory<TFieldValues extends FieldValues>({
  id,
  children,
  onSubmit,
  defaultValues,
  schema,
  className,
  values,
}: FormWrapperProps<TFieldValues>) {
  const methods = useForm<TFieldValues>({
    resolver: zodResolver(schema),
    defaultValues,
    // values: values as TFieldValues,
  });

  // const values = useWatch({ control: methods.control });
  // console.log('values', values);
  console.log('errors', methods.formState.errors);

  return (
    <FormProvider {...methods}>
      <form
        id={id}
        onSubmit={methods.handleSubmit(onSubmit)}
        className={cn('grid grid-cols-1 gap-7 lg:gap-10', className)}
        noValidate
        autoComplete="off"
      >
        {children}
      </form>
    </FormProvider>
  );
}
