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
import { updateCollection } from '../_modules/collections.actions';
import { updateCollectionSchema } from '../_modules/collections.schemas';
import { objectToFormData } from '../_modules/form-helpers';
import { useFormAction } from '@/hooks/use-form-action';

type CollectionSettingsInput = z.infer<typeof updateCollectionSchema>;

interface CollectionSettingsFormProps {
  collection: {
    id: string;
    name: string;
    slug: string;
    templatePageId: string | null;
  };
}

export function CollectionSettingsForm({
  collection,
}: CollectionSettingsFormProps) {
  const form = useForm<CollectionSettingsInput>({
    resolver: zodResolver(updateCollectionSchema),
    defaultValues: {
      name: collection.name,
      slug: collection.slug,
      templatePageId: collection.templatePageId ?? '',
    },
  });

  const { submit, isPending, error } = useFormAction(updateCollection, {
    onSuccess: () => {
      form.reset();
    },
  });

  const onSubmit = (data: CollectionSettingsInput) => {
    submit(objectToFormData({ id: collection.id, ...data }));
  };

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-3">
        <input type="hidden" name="id" value={collection.id} />
        <Controller
          name="name"
          render={({ field, fieldState }) => {
            const id = useId();
            return (
              <FormItem>
                <Label htmlFor={id}>Name</Label>
                <Input id={id} {...field} required />
                {fieldState.error && (
                  <FormMessage>{fieldState.error.message}</FormMessage>
                )}
              </FormItem>
            );
          }}
        />
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
        <div>
          <Label htmlFor="templatePageId">Template page (optional)</Label>
          <select
            id="templatePageId"
            {...form.register('templatePageId')}
            className="rounded-md border border-input bg-transparent p-2 text-sm w-full"
          >
            <option value="">None</option>
          </select>
        </div>
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Saving…' : 'Save'}
        </Button>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </form>
    </FormProvider>
  );
}
