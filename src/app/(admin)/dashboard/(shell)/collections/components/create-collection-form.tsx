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
import { useRouter } from 'next/navigation';
import { PAGES } from '@/config/pages';
import { PostTypeMetaFields } from './post-type-meta-fields';
import { TemplatePageSelect } from './template-page-select';

type CreateCollectionInput = z.infer<typeof createCollectionSchema>;

const EMPTY: CreateCollectionInput = {
  name: '',
  singularName: '',
  slug: '',
  icon: 'database',
  description: '',
  templatePageId: '',
};

export function CreateCollectionForm({
  templatePages,
}: {
  templatePages: TemplatePageOption[];
}) {
  const router = useRouter();
  const form = useForm<CreateCollectionInput>({
    resolver: zodResolver(createCollectionSchema),
    defaultValues: EMPTY,
  });

  const { submit, isPending, error } = useFormAction(createCollection, {
    onSuccess: result => {
      form.reset(EMPTY);
      if (result.slug)
        router.push(PAGES.DASHBOARD.COLLECTION_SETTINGS(String(result.slug)));
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
              <FormLabel>Name (plural)</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  required
                  placeholder="e.g. Team members"
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
                Used in entry URLs: /collections/{"<slug>"}/{"<entry>"}.
              </p>
              <FormMessage />
            </FormItem>
          )}
        />
        <PostTypeMetaFields />
        <TemplatePageSelect templatePages={templatePages} />
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Creating…' : 'Create post type'}
        </Button>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </form>
    </Form>
  );
}
