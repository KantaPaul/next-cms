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
import { createCollection } from '../_modules/collections.actions';
import { createCollectionSchema } from '../_modules/collections.schemas';
import { objectToFormData } from '../_modules/form-helpers';
import { useFormAction } from '@/hooks/use-form-action';
import type { TemplatePageOption } from '@/app/(admin)/dashboard/(shell)/pages/_modules/pages.service';
import { TemplatePageSelect } from './template-page-select';

type CreateCollectionInput = z.infer<typeof createCollectionSchema>;

export function CreateCollectionForm({
  templatePages,
}: {
  templatePages: TemplatePageOption[];
}) {
  const form = useForm<CreateCollectionInput>({
    resolver: zodResolver(createCollectionSchema),
    defaultValues: { name: '', slug: '', templatePageId: '' },
  });

  const { submit, isPending, error } = useFormAction(createCollection, {
    onSuccess: () => {
      form.reset();
    },
  });

  const onSubmit = (data: CreateCollectionInput) => {
    submit(objectToFormData(data));
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input {...field} required placeholder="Collection name" />
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
                <Input {...field} required placeholder="my-collection" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <TemplatePageSelect templatePages={templatePages} />
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Creating…' : 'Create'}
        </Button>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </form>
    </Form>
  );
}
