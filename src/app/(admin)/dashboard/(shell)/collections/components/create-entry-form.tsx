'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { FormInput as Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { createCollectionEntry } from '../_modules/collections.actions';
import { objectToFormData } from '../_modules/form-helpers';
import { useFormAction } from '@/hooks/use-form-action';
import {
  EntryDataFields,
  entryFormSchema,
  type EntryFieldConfig,
  type EntryFormValues,
} from './entry-data-fields';

interface CreateEntryFormProps {
  collectionId: string;
  fields: EntryFieldConfig[];
}

export function CreateEntryForm({
  collectionId,
  fields,
}: CreateEntryFormProps) {
  const defaultValues: EntryFormValues = { slug: '' };
  fields.forEach(f => {
    defaultValues[`data-${f.key}`] = f.type === 'boolean' ? false : '';
  });

  const form = useForm<EntryFormValues>({
    resolver: zodResolver(entryFormSchema),
    defaultValues,
  });

  const { submit, isPending, error } = useFormAction(createCollectionEntry, {
    onSuccess: () => {
      form.reset(defaultValues);
    },
  });

  const onSubmit = (data: EntryFormValues) => {
    submit(objectToFormData({ collectionId, ...data }));
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
        <FormField
          control={form.control}
          name="slug"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Slug</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  value={String(field.value ?? '')}
                  required
                  placeholder="my-entry"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <EntryDataFields fields={fields} richtextRows={4} />
        <div>
          <Button type="submit" disabled={isPending}>
            {isPending ? 'Creating…' : 'Create entry'}
          </Button>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </form>
    </Form>
  );
}
