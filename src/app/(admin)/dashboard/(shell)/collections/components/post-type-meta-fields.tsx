'use client';

import { useFormContext } from 'react-hook-form';
import { PostTypeIcon } from '@/components/atoms/post-type-icon';
import { FormInput as Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { POST_TYPE_ICONS } from '@/config/post-types';
import { cn } from '@/lib/utils/cn';

type MetaValues = {
  singularName?: string;
  icon?: string;
  description?: string;
};

/** Singular label, icon grid and description shared by create + settings forms. */
export function PostTypeMetaFields() {
  const { control } = useFormContext<MetaValues>();

  return (
    <>
      <FormField
        control={control}
        name="singularName"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Singular name</FormLabel>
            <FormControl>
              <Input
                {...field}
                value={field.value ?? ''}
                placeholder="e.g. Team member"
              />
            </FormControl>
            <p className="text-xs text-muted-foreground">
              Used for buttons like “New team member”.
            </p>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="icon"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Icon</FormLabel>
            <div
              role="radiogroup"
              aria-label="Icon"
              className="grid grid-cols-6 gap-1.5"
            >
              {POST_TYPE_ICONS.map(name => {
                const selected = (field.value || 'database') === name;
                return (
                  <button
                    key={name}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    aria-label={name}
                    title={name}
                    onClick={() => field.onChange(name)}
                    className={cn(
                      'flex aspect-square items-center justify-center rounded-md border transition-colors',
                      selected
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-muted'
                    )}
                  >
                    <PostTypeIcon name={name} className="size-4" />
                  </button>
                );
              })}
            </div>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Description (optional)</FormLabel>
            <FormControl>
              <Textarea {...field} value={field.value ?? ''} rows={2} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
}
