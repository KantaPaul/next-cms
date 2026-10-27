'use client';

import { useId } from 'react';
import { z } from 'zod';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { FormInput as Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Controller } from 'react-hook-form';
import { Select } from '@/components/ui/select';
import {
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FormItem, FormMessage } from '@/components/ui/form';
import { addCollectionField } from '../_modules/collections.actions';
import { collectionFieldSchema } from '../_modules/collections.schemas';
import { objectToFormData } from '../_modules/form-helpers';
import { useFormAction } from '@/hooks/use-form-action';

type CollectionFieldInput = z.infer<typeof collectionFieldSchema>;

interface AddFieldFormProps {
  collectionId: string;
}

const FIELD_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'richtext', label: 'Rich text' },
  { value: 'number', label: 'Number' },
  { value: 'boolean', label: 'Boolean' },
  { value: 'date', label: 'Date' },
  { value: 'select', label: 'Select' },
  { value: 'media', label: 'Media' },
  { value: 'relation', label: 'Relation' },
];

export function AddFieldForm({ collectionId }: AddFieldFormProps) {
  const form = useForm<CollectionFieldInput>({
    resolver: zodResolver(collectionFieldSchema) as any,
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

  const onSubmit = (data: any) => {
    submit(
      objectToFormData({
        collectionId,
        ...data,
      })
    );
  };

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-3">
        <input type="hidden" name="collectionId" value={collectionId} />
        <div className="grid gap-2">
          <Controller
            name="key"
            render={({ field, fieldState }) => {
              const id = useId();
              return (
                <FormItem>
                  <Label htmlFor={id}>Key</Label>
                  <Input id={id} {...field} required placeholder="key" />
                  {fieldState.error && (
                    <FormMessage>{fieldState.error.message}</FormMessage>
                  )}
                </FormItem>
              );
            }}
          />
          <Controller
            name="label"
            render={({ field, fieldState }) => {
              const id = useId();
              return (
                <FormItem>
                  <Label htmlFor={id}>Label</Label>
                  <Input id={id} {...field} required placeholder="Label" />
                  {fieldState.error && (
                    <FormMessage>{fieldState.error.message}</FormMessage>
                  )}
                </FormItem>
              );
            }}
          />
          <Controller
            name="type"
            render={({ field, fieldState }) => {
              const id = useId();
              return (
                <FormItem>
                  <Label htmlFor={id}>Type</Label>
                  <Select
                    value={field.value as string}
                    onValueChange={(value: string) =>
                      field.onChange(value as any)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a type" />
                    </SelectTrigger>
                    <SelectContent>
                      {FIELD_TYPES.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {fieldState.error && (
                    <FormMessage>{fieldState.error.message}</FormMessage>
                  )}
                </FormItem>
              );
            }}
          />
          <Controller
            name="required"
            render={({ field }) => {
              const id = useId();
              return (
                <div className="flex items-center gap-2">
                  <Checkbox
                    id={id}
                    checked={field.value === true || field.value === 'on'}
                    onCheckedChange={(value: boolean) => field.onChange(value)}
                  />
                  <Label htmlFor={id}>Required</Label>
                </div>
              );
            }}
          />
          <Button type="submit" disabled={isPending}>
            {isPending ? 'Adding…' : 'Add field'}
          </Button>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      </form>
    </FormProvider>
  );
}
