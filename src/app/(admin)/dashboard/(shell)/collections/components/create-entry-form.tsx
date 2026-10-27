'use client';

import { useId } from 'react';
import { z } from 'zod';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Controller } from 'react-hook-form';
import { FormInput as Input } from '@/components/ui/input';
import { FormItem, FormMessage } from '@/components/ui/form';
import { createCollectionEntry } from '../_modules/collections.actions';
import { objectToFormData } from '../_modules/form-helpers';
import { useFormAction } from '@/hooks/use-form-action';

type FieldConfig = {
  key: string;
  label: string;
  type: string;
  required: boolean;
};

interface CreateEntryFormProps {
  collectionId: string;
  fields: FieldConfig[];
}

export function CreateEntryForm({
  collectionId,
  fields,
}: CreateEntryFormProps) {
  const defaultValues: Record<string, unknown> = { slug: '' };
  fields.forEach(f => {
    defaultValues[`data-${f.key}`] = '';
  });

  const form = useForm({
    resolver: zodResolver(
      z.object({
        slug: z.string().min(1, 'Slug is required'),
        ...Object.fromEntries(
          fields.map(f => [
            `data-${f.key}`,
            z.any().optional(),
          ])
        ),
      })
    ) as any,
    defaultValues,
  });

  const { submit, isPending, error } = useFormAction(createCollectionEntry, {
    onSuccess: () => {
      form.reset(defaultValues);
    },
  });

  const onSubmit = (data: any) => {
    submit(objectToFormData(data));
  };

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-3">
        <input type="hidden" name="collectionId" value={collectionId} />
        <div>
          <Controller
            name="slug"
            render={({ field, fieldState }) => {
              const id = useId();
              return (
                <FormItem>
                  <Label htmlFor={id}>Slug</Label>
                  <Input id={id} {...field} required />
                  {fieldState.error && (
                    <FormMessage>{fieldState.error.message}</FormMessage>
                  )}
                </FormItem>
              );
            }}
          />
        </div>
        {fields.map(field => (
          <div key={field.key} className="grid gap-1">
            <Label htmlFor={`data-${field.key}`}>
              {field.label}{field.required ? ' *' : ''}
            </Label>
            <Controller
              name={`data-${field.key}`}
              render={({ field: f, fieldState }) => {
                const id = useId();
                const isTextarea =
                  field.type === 'text' || field.type === 'richtext';
                return (
                  <>
                    {isTextarea ? (
                      <textarea
                        id={id}
                        {...f}
                        rows={field.type === 'richtext' ? 4 : 2}
                        className="rounded-md border border-input bg-transparent p-2 text-sm w-full"
                      />
                    ) : (
                      <Input id={id} {...f} />
                    )}
                    {fieldState.error && (
                      <FormMessage>{fieldState.error.message}</FormMessage>
                    )}
                  </>
                );
              }}
            />
          </div>
        ))}
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Creating…' : 'Create entry'}
        </Button>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </form>
    </FormProvider>
  );
}
