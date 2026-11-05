'use client';

import { z } from 'zod';
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
import { updateCollection } from '../_modules/collections.actions';
import { updateCollectionSchema } from '../_modules/collections.schemas';
import { objectToFormData } from '../_modules/form-helpers';
import { useFormAction } from '@/hooks/use-form-action';
import type { TemplatePageOption } from '@/app/(admin)/dashboard/(shell)/pages/_modules/pages.service';
import { PostTypeMetaFields } from './post-type-meta-fields';
import { TemplatePageSelect } from './template-page-select';

type CollectionSettingsInput = z.infer<typeof updateCollectionSchema>;

interface CollectionSettingsFormProps {
  collection: {
    id: string;
    name: string;
    slug: string;
    singularName: string | null;
    icon: string | null;
    description: string | null;
    templatePageId: string | null;
  };
  templatePages: TemplatePageOption[];
}

export function CollectionSettingsForm({
  collection,
  templatePages,
}: CollectionSettingsFormProps) {
  const form = useForm<CollectionSettingsInput>({
    resolver: zodResolver(updateCollectionSchema),
    defaultValues: {
      name: collection.name,
      slug: collection.slug,
      singularName: collection.singularName ?? '',
      icon: (collection.icon ?? 'database') as CollectionSettingsInput['icon'],
      description: collection.description ?? '',
      templatePageId: collection.templatePageId ?? '',
    },
  });

  const { submit, isPending, error } = useFormAction(updateCollection, {
    onSuccess: () => {
      // Keep the saved values as the new baseline.
      form.reset(form.getValues());
    },
  });

  const onSubmit = (data: CollectionSettingsInput) => {
    submit(objectToFormData({ id: collection.id, ...data }));
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name (plural)</FormLabel>
              <FormControl>
                <Input {...field} value={field.value ?? ''} required />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="slug"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Slug</FormLabel>
              <FormControl>
                <Input {...field} value={field.value ?? ''} required />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <PostTypeMetaFields />
        <TemplatePageSelect templatePages={templatePages} />
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Saving…' : 'Save'}
        </Button>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </form>
    </Form>
  );
}
