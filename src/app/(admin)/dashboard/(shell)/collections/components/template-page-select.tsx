'use client';

import { useTranslations } from 'next-intl';
import { useStatusLabel } from '@/i18n/use-content-labels';
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
  const t = useTranslations('collections.templatePage');
  const statusLabel = useStatusLabel();
  const { control } = useFormContext<{ templatePageId?: string | null }>();

  return (
    <FormField
      control={control}
      name="templatePageId"
      render={({ field }) => (
        <FormItem>
          <FormLabel>{t('label')}</FormLabel>
          <Select
            value={field.value || NONE}
            onValueChange={value => field.onChange(value === NONE ? '' : value)}
          >
            <FormControl>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t('none')} />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              <SelectItem value={NONE}>{t('none')}</SelectItem>
              {templatePages.map(page => (
                <SelectItem key={page.id} value={page.id}>
                  {`${page.title} (/${page.slug})`}
                  {page.status !== 'published' ? ` — ${statusLabel(page.status)}` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormDescription className="text-xs">
            {t('hint')}
          </FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
