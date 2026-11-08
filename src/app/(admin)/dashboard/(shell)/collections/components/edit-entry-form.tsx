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
import { updateCollectionEntry } from '../_modules/collections.actions';
import { objectToFormData } from '../_modules/form-helpers';
import { useFormAction } from '@/hooks/use-form-action';
import { EntryDataFields, type EntryFieldConfig } from './entry-data-fields';
import {
  entryFormSchema,
  type EntryFormValues,
} from '../_modules/collections.schemas';

interface EditEntryFormProps {
  entryId: string;
  collectionId: string;
  entrySlug: string;
  entryData: Record<string, unknown> | undefined;
  fields: EntryFieldConfig[];
}

export function EditEntryForm({
  entryId,
  collectionId,
  entrySlug,
  entryData,
  fields,
}: EditEntryFormProps) {
  const defaultValues: EntryFormValues = { slug: entrySlug };
  fields.forEach(f => {
    defaultValues[`data-${f.key}`] =
      entryData?.[f.key] ?? (f.type === 'boolean' ? false : '');
  });

  const form = useForm<EntryFormValues>({
    resolver: zodResolver(entryFormSchema),
    defaultValues,
  });

  const { submit, isPending, error } = useFormAction(updateCollectionEntry, {
    onSuccess: () => {
      form.reset(form.getValues());
    },
  });

  const onSubmit = (data: EntryFormValues) => {
    submit(objectToFormData({ entryId, collectionId, ...data }));
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
                <Input {...field} value={String(field.value ?? '')} required />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <EntryDataFields fields={fields} />
        <div>
          <Button type="submit" disabled={isPending}>
            {isPending ? 'Saving…' : 'Save draft'}
          </Button>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </form>
    </Form>
  );
}
