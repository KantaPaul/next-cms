'use client';

import { Loader2, ExternalLink } from 'lucide-react';
import { useId, useState, useTransition, type FormEvent } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  DEFAULT_SITE_LOCALES,
} from '@/db/schemas/sites.schema';
import { createSite } from '@/server/actions/site.actions';
import { handleActionResponse } from '@/lib/utils/handle-action-response';
import { createSiteSchema } from '@/app/(admin)/dashboard/(shell)/sites/_modules/sites.schemas';
import type { CreateSiteInput } from '@/app/(admin)/dashboard/(shell)/sites/_modules/sites.schemas';
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
import { Checkbox } from '@/components/ui/checkbox';
import { FormItem, FormMessage } from '@/components/ui/form';

const localeSchema = z.object({
  code: z.string().trim().min(2, 'Code is required').max(12),
  label: z.string().trim().min(1, 'Label is required').max(40),
});

interface SitesManagerProps {
  sites: {
    siteId: string;
    siteName: string;
    slug: string | null;
    primaryHost: string | null;
    roleName: string;
  }[];
  current: string;
}

type Locale = { code: string; label: string };


export function SitesManager({
  sites,
  current,
}: SitesManagerProps) {
  const [pending, startTransition] = useTransition();

  const form = useForm<CreateSiteInput>({
    resolver: zodResolver(createSiteSchema),
    defaultValues: {
      name: '',
      slug: '',
      primaryHost: '',
      extraDomains: '',
      defaultLocale: DEFAULT_SITE_LOCALES[0].code,
      locales: DEFAULT_SITE_LOCALES.map(l => ({
        code: l.code,
        label: l.label,
      })),
    },
  });

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    startTransition(async () => {
      try {
        const result = await createSite({
          name: form.getValues('name'),
          slug: form.getValues('slug') || undefined,
          primaryHost: form.getValues('primaryHost') || undefined,
          extraDomains: form.getValues('extraDomains') || undefined,
          defaultLocale: form.getValues('defaultLocale'),
          locales: form.getValues('locales'),
        });
        if (result) {
          form.reset();
          toast.success('Site created');
          window.location.reload();
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to create site');
      }
    });
  };

  const toggle = (code: string) => {
    const currentCodes = form.getValues('locales') as Locale[];
    const isSelected = currentCodes.some((item: Locale) => item.code === code);
    const next: Locale[] = isSelected
      ? currentCodes.filter((item: Locale) => item.code !== code)
      : [...currentCodes, { code, label: '' }];
    form.setValue('locales', next);
    const defaultLocale = form.getValues('defaultLocale') as string;
    if (!next.some((item: Locale) => item.code === defaultLocale)) {
      form.setValue('defaultLocale', (next[0] as Locale | undefined)?.code ?? DEFAULT_SITE_LOCALES[0].code);
    }
  };

  const isLocaleSelected = (code: string) =>
    form.getValues('locales').some((l: Locale) => l.code === code);

  return (
    <FormProvider {...form}>
      <div className="grid gap-8 lg:grid-cols-[1fr_22rem]">
        <ul className="divide-y divide-steel-100 rounded-lg border border-steel-200 dark:divide-dark-300 dark:border-dark-300">
          {sites.map(site => (
            <li key={site.siteId} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="font-medium">
                  {site.siteName}
                  {site.siteId === current ? (
                    <span className="ml-2 text-xs text-steel-500">Current</span>
                  ) : null}
                </p>
                <p className="text-sm text-steel-500">
                  {site.slug ? `/${site.slug}` : 'No slug'} ·
                  {site.primaryHost || 'No primary host'} · {site.roleName}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {site.slug && (
                  <a
                    href={`/${site.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-steel-500 hover:text-steel-700"
                  >
                    <ExternalLink size={14} />
                    View site
                  </a>
                )}
              </div>
            </li>
          ))}
        </ul>
        <form onSubmit={onSubmit} className="grid gap-3 rounded-lg border border-steel-200 p-4 dark:border-dark-300">
          <h2 className="font-semibold">New site</h2>
          <Controller
            name="name"
            render={({ field, fieldState }) => {
              const id = useId();
              return (
                <FormItem>
                  <Label htmlFor={id}>Name</Label>
                  <Input id={id} {...field} required />
                  {fieldState.error && (
                    <FormMessage>{fieldState.error.message}</FormMessage>
                  )}
                </FormItem>
              );
            }}
          />
          <Controller
            name="slug"
            render={({ field, fieldState }) => {
              const id = useId();
              const preview = field.value
                ? `/${field.value.replace(/^\/+/, '')}`
                : '/<slug>';
              return (
                <FormItem>
                  <Label htmlFor={id}>Slug</Label>
                  <Input
                    id={id}
                    {...field}
                    placeholder="main"
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-steel-500 mt-1">
                    Public URL prefix: <code className="block">{preview}</code>
                  </p>
                  {fieldState.error && (
                    <FormMessage>{fieldState.error.message}</FormMessage>
                  )}
                </FormItem>
              );
            }}
          />
          <Controller
            name="primaryHost"
            render={({ field, fieldState }) => {
              const id = useId();
              return (
                <FormItem>
                  <Label htmlFor={id}>Primary host</Label>
                  <Input id={id} {...field} placeholder="example.com" />
                  {fieldState.error && (
                    <FormMessage>{fieldState.error.message}</FormMessage>
                  )}
                </FormItem>
              );
            }}
          />
          <Controller
            name="extraDomains"
            render={({ field, fieldState }) => {
              const id = useId();
              return (
                <FormItem>
                  <Label htmlFor={id}>Extra domains</Label>
                  <textarea
                    id={id}
                    {...field}
                    className="min-h-20 w-full rounded-md border border-steel-200 bg-white px-3 py-2 text-sm dark:border-dark-300 dark:bg-dark-100"
                    placeholder="www.example.com"
                  />
                  {fieldState.error && (
                    <FormMessage>{fieldState.error.message}</FormMessage>
                  )}
                </FormItem>
              );
            }}
          />
          <fieldset className="grid gap-2 text-sm">
            <legend>Languages</legend>
            {DEFAULT_SITE_LOCALES.map(locale => (
              <label key={locale.code} className="flex items-center gap-2">
                <Checkbox
                  checked={isLocaleSelected(locale.code)}
                  onCheckedChange={(checked: boolean) => toggle(locale.code)}
                />
                {locale.label}
              </label>
            ))}
          </fieldset>
          <Controller
            name="defaultLocale"
            render={({ field, fieldState }) => {
              const id = useId();
              const availableLocales = form.getValues('locales') as Locale[];
              return (
                <FormItem>
                  <Label htmlFor={id}>Default language</Label>
                  <Select
                    id={id}
                    {...field}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select default locale" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableLocales.map(locale => (
                        <SelectItem key={locale.code} value={locale.code}>
                          {locale.label}
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
          <Button
            type="submit"
            disabled={pending || form.getValues('locales').length === 0}
          >
            {pending ? <Loader2 className="animate-spin" /> : null}
            Create site
          </Button>
        </form>
      </div>
    </FormProvider>
  );
}
