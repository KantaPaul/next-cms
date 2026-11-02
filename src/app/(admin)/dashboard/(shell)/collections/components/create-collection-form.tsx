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
import { slugify } from '@/lib/utils/slugify';
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
      form.reset({ name: '', slug: '', templatePageId: '' });
    },
  });

  const onSubmit = (data: CreateCollectionInput) => {
    const finalData = {
      ...data,
      slug: data.slug || slugify(data.name),
    };
    submit(objectToFormData(finalData));
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
                <Input
                  {...field}
                  required
                  placeholder="Collection name"
                  onChange={e => {
                    field.onChange(e);
                    form.setValue('slug', slugify(e.target.value));
                  }}
                />
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
              <FormLabel className="flex items-center justify-between">
                <span>Slug</span>
                <span className="text-xs font-normal text-muted-foreground">Auto-generated</span>
              </FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="auto-generated-slug"
                  className="bg-muted/50 font-mono text-xs"
                />
              </FormControl>
              <p className="text-xs text-muted-foreground">
                URL identifier generated dynamically from the name.
              </p>
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
