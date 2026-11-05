'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
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
import { slugify } from '@/lib/utils/slugify';
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
  singularName?: string;
}

export function CreateEntryForm({
  collectionId,
  fields,
  singularName = 'entry',
}: CreateEntryFormProps) {
  // Bumped after each save so uncontrolled editors (rich text) remount empty.
  const [resetKey, setResetKey] = useState(0);
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
      setResetKey(k => k + 1);
      toast.success(`${singularName} saved as draft.`);
    },
  });

  const primaryField =
    fields.find(f => ['title', 'name', 'label', 'heading', 'question', 'author'].includes(f.key))?.key ||
    fields.find(f => f.type === 'text')?.key;

  const handleFieldChange = (key: string, value: unknown) => {
    if (key === primaryField && typeof value === 'string') {
      const generated = slugify(value);
      form.setValue('slug', generated, { shouldValidate: true });
    }
  };

  const onSubmit = (data: EntryFormValues) => {
    let currentSlug = String(data.slug ?? '').trim();
    if (!currentSlug && primaryField) {
      const primaryVal = data[`data-${primaryField}`];
      if (typeof primaryVal === 'string' && primaryVal.trim()) {
        currentSlug = slugify(primaryVal);
      }
    }
    submit(objectToFormData({ collectionId, ...data, slug: currentSlug }));
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
        <EntryDataFields
          key={resetKey}
          fields={fields}
          onFieldChange={handleFieldChange}
        />
        <FormField
          control={form.control}
          name="slug"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center justify-between">
                <span>Slug</span>
                <span className="text-xs font-normal text-muted-foreground">Auto-generated</span>
              </FormLabel>
              <FormControl>
                <Input
                  {...field}
                  value={String(field.value ?? '')}
                  placeholder="auto-generated-slug"
                  className="bg-muted/50 font-mono text-xs"
                />
              </FormControl>
              <p className="text-xs text-muted-foreground">
                Automatically generated dynamically from entry content. No need to input manually.
              </p>
              <FormMessage />
            </FormItem>
          )}
        />
        <div>
          <Button type="submit" disabled={isPending}>
            {isPending ? 'Creating…' : `Create ${singularName.toLowerCase()}`}
          </Button>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </form>
    </Form>
  );
}
