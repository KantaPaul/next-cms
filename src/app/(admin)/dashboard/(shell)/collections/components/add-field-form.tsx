'use client';

import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { FormInput as Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { addCollectionField } from '../_modules/collections.actions';
import {
  collectionFieldSchema,
  FIELD_TYPES,
} from '../_modules/collections.schemas';
import { objectToFormData } from '../_modules/form-helpers';
import { useFormAction } from '@/hooks/use-form-action';

type CollectionFieldInput = z.input<typeof collectionFieldSchema>;

interface AddFieldFormProps {
  collectionId: string;
}

export function AddFieldForm({ collectionId }: AddFieldFormProps) {
  const form = useForm<CollectionFieldInput>({
    resolver: zodResolver(collectionFieldSchema),
    defaultValues: {
      key: '',
      label: '',
      type: 'text',
      required: false,
      config: '{}',
    },
  });

  const { submit, isPending, error } = useFormAction(addCollectionField, {
    onSuccess: () => {
      form.reset();
    },
  });

  const onSubmit = (data: CollectionFieldInput) => {
    submit(objectToFormData({ collectionId, ...data }));
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="grid gap-3 sm:grid-cols-2"
      >
        <FormField
          control={form.control}
          name="key"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Key</FormLabel>
              <FormControl>
                <Input {...field} required placeholder="key" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="label"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Label</FormLabel>
              <FormControl>
                <Input {...field} required placeholder="Label" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Type</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {FIELD_TYPES.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="required"
          render={({ field }) => (
            <FormItem className="flex items-center gap-2 self-end pb-2">
              <FormControl>
                <Checkbox
                  checked={field.value === true}
                  onCheckedChange={value => field.onChange(value === true)}
                />
              </FormControl>
              <FormLabel className="font-normal">Required</FormLabel>
            </FormItem>
          )}
        />
        <div className="sm:col-span-2">
          <Button type="submit" disabled={isPending}>
            {isPending ? 'Adding…' : 'Add field'}
          </Button>
          {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
        </div>
      </form>
    </Form>
  );
}
