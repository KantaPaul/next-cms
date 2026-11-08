'use client';

import { useFormContext } from 'react-hook-form';
import { TextEditor } from '@/components/atoms/text-editor';
import { MediaField } from '@/components/media/media-picker';
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
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { type EntryFormValues } from '../_modules/collections.schemas';

export type EntryFieldConfig = {
  key: string;
  label: string;
  type: string;
  required: boolean;
  /** Choices for select fields. */
  choices?: string[];
  /** Entries of the related post type, for relation fields. */
  options?: { id: string; label: string }[];
};

// Slug plus one `data-{key}` value per field; data values are validated server-side.

// Radix Select reserves the empty string, so "None" uses a sentinel value.
const NONE = '__none__';

/** Renders one form control per post type field, named `data-{key}`. */
export function EntryDataFields({
  fields,
  onFieldChange,
}: {
  fields: EntryFieldConfig[];
  onFieldChange?: (key: string, value: unknown) => void;
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
        const set = (value: unknown) => {
          field.onChange(value);
          onFieldChange?.(config.key, value);
        };
        const text = String(field.value ?? '');

        if (config.type === 'boolean') {
          return (
            <FormItem className="flex items-center gap-2">
              <FormControl>
                <Checkbox
                  checked={field.value === true || field.value === 'true'}
                  onCheckedChange={value => set(value === true)}
                />
              </FormControl>
              {label}
              <FormMessage />
            </FormItem>
          );
        }

        if (config.type === 'select' || config.type === 'relation') {
          const options =
            config.type === 'select'
              ? (config.choices ?? []).map(c => ({ id: c, label: c }))
              : (config.options ?? []);
          return (
            <FormItem>
              {label}
              <Select
                value={text || NONE}
                onValueChange={value => set(value === NONE ? '' : value)}
              >
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value={NONE}>None</SelectItem>
                  {options.map(o => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          );
        }

        if (config.type === 'media') {
          return (
            <FormItem>
              {label}
              <MediaField value={text} onChange={set} />
              <FormMessage />
            </FormItem>
          );
        }

        if (config.type === 'richtext') {
          return (
            <FormItem>
              {label}
              <div className="rounded-md border">
                <TextEditor value={text} onChange={set} />
              </div>
              <FormMessage />
            </FormItem>
          );
        }

        return (
          <FormItem>
            {label}
            <FormControl>
              <Input
                {...field}
                value={text}
                type={
                  config.type === 'number'
                    ? 'number'
                    : config.type === 'date'
                      ? 'date'
                      : config.type === 'url'
                        ? 'url'
                        : 'text'
                }
                step={config.type === 'number' ? 'any' : undefined}
                placeholder={config.type === 'url' ? 'https://' : undefined}
                onChange={e => set(e.target.value)}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        );
      }}
    />
  ));
}
