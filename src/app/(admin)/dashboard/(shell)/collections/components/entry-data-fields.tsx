'use client';

import { useFormContext } from 'react-hook-form';
import { z } from 'zod';
import { Checkbox } from '@/components/ui/checkbox';
import { FormInput as Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

export type EntryFieldConfig = {
  key: string;
  label: string;
  type: string;
  required: boolean;
};

// Slug plus one `data-{key}` value per field; data values are validated server-side.
export const entryFormSchema = z
  .object({ slug: z.string().min(1, 'Slug is required') })
  .catchall(z.unknown());

export type EntryFormValues = z.infer<typeof entryFormSchema>;

/** Renders one shadcn form control per collection field, named `data-{key}`. */
export function EntryDataFields({
  fields,
  richtextRows = 6,
}: {
  fields: EntryFieldConfig[];
  richtextRows?: number;
}) {
  const { control } = useFormContext();

  return fields.map(config => (
    <FormField
      key={config.key}
      control={control}
      name={`data-${config.key}`}
      render={({ field }) => {
        const label = (
          <FormLabel>
            {config.label}
            {config.required && <span className="text-destructive"> *</span>}
          </FormLabel>
        );

        if (config.type === 'boolean') {
          return (
            <FormItem className="flex items-center gap-2">
              <FormControl>
                <Checkbox
                  checked={field.value === true || field.value === 'true'}
                  onCheckedChange={value => field.onChange(value === true)}
                />
              </FormControl>
              {label}
              <FormMessage />
            </FormItem>
          );
        }

        return (
          <FormItem>
            {label}
            <FormControl>
              {config.type === 'richtext' ? (
                <Textarea
                  {...field}
                  value={String(field.value ?? '')}
                  rows={richtextRows}
                />
              ) : (
                <Input
                  {...field}
                  value={String(field.value ?? '')}
                  type={
                    config.type === 'number'
                      ? 'number'
                      : config.type === 'date'
                        ? 'date'
                        : 'text'
                  }
                />
              )}
            </FormControl>
            <FormMessage />
          </FormItem>
        );
      }}
    />
  ));
}
