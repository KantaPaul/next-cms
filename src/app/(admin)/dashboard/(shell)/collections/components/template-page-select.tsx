'use client';

import { useFormContext } from 'react-hook-form';
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { TemplatePageOption } from '@/app/(admin)/dashboard/(shell)/pages/_modules/pages.service';

// Radix Select reserves the empty string, so "None" uses a sentinel value.
const NONE = '__none__';

export function TemplatePageSelect({
  templatePages,
}: {
  templatePages: TemplatePageOption[];
}) {
  const { control } = useFormContext<{ templatePageId?: string | null }>();

  return (
    <FormField
      control={control}
      name="templatePageId"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Template page (optional)</FormLabel>
          <Select
            value={field.value || NONE}
            onValueChange={value => field.onChange(value === NONE ? '' : value)}
          >
            <FormControl>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="None" />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              <SelectItem value={NONE}>None</SelectItem>
              {templatePages.map(page => (
                <SelectItem key={page.id} value={page.id}>
                  {page.title} (/{page.slug})
                  {page.status !== 'published' ? ` — ${page.status}` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormDescription className="text-xs">
            Builder pages from this site. Only published pages render entries.
          </FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
