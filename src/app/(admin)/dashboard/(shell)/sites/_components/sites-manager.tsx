'use client';

import { Loader2, ExternalLink, Pencil, Plus, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useId, useState, useTransition, type FormEvent } from 'react';
import { useForm, FormProvider, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  DEFAULT_SITE_LOCALES,
  type SiteLocale,
} from '@/db/schemas/sites.schema';
import { createSite, switchSite, updateSite } from '@/server/actions/site.actions';
import { handleActionResponse } from '@/lib/utils/handle-action-response';
import { createSiteSchema } from '@/app/(admin)/dashboard/(shell)/sites/_modules/sites.schemas';
import type { CreateSiteInput } from '@/app/(admin)/dashboard/(shell)/sites/_modules/sites.schemas';
import { FormInput as Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { FormItem, FormMessage } from '@/components/ui/form';
import { cn } from '@/lib/utils/cn';

interface SiteListItem {
  siteId: string;
  siteName: string;
  slug: string | null;
  primaryHost: string | null;
  extraDomains?: string[];
  defaultLocale?: string;
  locales?: SiteLocale[];
  roleName: string;
}

interface SitesManagerProps {
  sites: SiteListItem[];
  current: string;
}

type Locale = { code: string; label: string };

const DEFAULT_FORM_VALUES: CreateSiteInput = {
  name: '',
  slug: '',
  primaryHost: '',
  extraDomains: '',
  defaultLocale: DEFAULT_SITE_LOCALES[0].code,
  locales: DEFAULT_SITE_LOCALES.map(l => ({
    code: l.code,
    label: l.label,
  })),
};

export function SitesManager({
  sites,
  current,
}: SitesManagerProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editingSiteId, setEditingSiteId] = useState<string | null>(null);

  const form = useForm<CreateSiteInput>({
    resolver: zodResolver(createSiteSchema),
    defaultValues: DEFAULT_FORM_VALUES,
  });

  const watchedLocales = form.watch('locales') ?? [];

  const startEditing = (site: SiteListItem) => {
    setEditingSiteId(site.siteId);
    const siteLocales =
      Array.isArray(site.locales) && site.locales.length
        ? site.locales
        : DEFAULT_SITE_LOCALES;
    form.reset({
      name: site.siteName,
      slug: site.slug ?? '',
      primaryHost: site.primaryHost ?? '',
      extraDomains: (site.extraDomains ?? []).join(', '),
      defaultLocale: site.defaultLocale || siteLocales[0]?.code || 'en',
      locales: siteLocales.map(l => ({ code: l.code, label: l.label })),
    });
  };

  const cancelEditing = () => {
    setEditingSiteId(null);
    form.reset(DEFAULT_FORM_VALUES);
  };

  const onSubmit = form.handleSubmit(values => {
    startTransition(async () => {
      if (editingSiteId) {
        await handleActionResponse(
          updateSite({
            siteId: editingSiteId,
            name: values.name,
            slug: values.slug,
            primaryHost: values.primaryHost || null,
            extraDomains: values.extraDomains || null,
            defaultLocale: values.defaultLocale,
            locales: values.locales,
          }),
          () => {
            toast.success('Site updated');
            setEditingSiteId(null);
            form.reset(DEFAULT_FORM_VALUES);
            router.refresh();
          }
        );
      } else {
        await handleActionResponse(
          createSite({
            name: values.name,
            slug: values.slug,
            primaryHost: values.primaryHost || undefined,
            extraDomains: values.extraDomains || undefined,
            defaultLocale: values.defaultLocale,
            locales: values.locales,
          }),
          () => {
            form.reset(DEFAULT_FORM_VALUES);
            toast.success('Site created');
            router.refresh();
          }
        );
      }
    });
  });

  const toggle = (code: string) => {
    const currentCodes = (form.getValues('locales') ?? []) as Locale[];
    const isSelected = currentCodes.some((item: Locale) => item.code === code);
    const label =
      DEFAULT_SITE_LOCALES.find(l => l.code === code)?.label ?? code;
    const next: Locale[] = isSelected
      ? currentCodes.filter((item: Locale) => item.code !== code)
      : [...currentCodes, { code, label }];
    form.setValue('locales', next, { shouldValidate: true, shouldDirty: true });
    const defaultLocale = form.getValues('defaultLocale') as string;
    if (!next.some((item: Locale) => item.code === defaultLocale)) {
      form.setValue(
        'defaultLocale',
        (next[0] as Locale | undefined)?.code ?? DEFAULT_SITE_LOCALES[0].code,
        { shouldValidate: true, shouldDirty: true }
      );
    }
  };

  const isLocaleSelected = (code: string) =>
    watchedLocales.some((l: Locale) => l.code === code);

  return (
    <FormProvider {...form}>
      <div className="grid gap-8 lg:grid-cols-[1fr_24rem]">
        <ul className="divide-y divide-steel-100 rounded-lg border border-steel-200 dark:divide-dark-300 dark:border-dark-300 self-start">
          {sites.map(site => {
            const isEditing = editingSiteId === site.siteId;
            return (
              <li
                key={site.siteId}
                className={cn(
                  'flex flex-wrap items-center justify-between gap-3 px-4 py-3 transition-colors',
                  isEditing && 'bg-indigo-50/60 dark:bg-indigo-950/20'
                )}
              >
                <div className="min-w-0">
                  <p className="font-medium flex items-center gap-2">
                    <span>{site.siteName}</span>
                    {site.siteId === current ? (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                        Current
                      </span>
                    ) : null}
                  </p>
                  <p className="text-sm text-steel-500">
                    {site.slug ? `/${site.slug}` : 'No slug'} ·{' '}
                    {site.primaryHost || 'No primary host'} · {site.roleName}
                  </p>
                  {site.extraDomains && site.extraDomains.length > 0 && (
                    <p className="text-xs text-steel-400">
                      Extra domains: {site.extraDomains.join(', ')}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {site.siteId !== current && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={pending}
                      onClick={() => {
                        startTransition(async () => {
                          await switchSite(site.siteId);
                          router.refresh();
                        });
                      }}
                    >
                      Switch
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant={isEditing ? 'secondary' : 'outline'}
                    size="sm"
                    onClick={() =>
                      isEditing ? cancelEditing() : startEditing(site)
                    }
                  >
                    <Pencil className="mr-1.5 size-3.5" />
                    {isEditing ? 'Editing' : 'Edit'}
                  </Button>
                  {site.slug && (
                    <a
                      href={`/${site.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-steel-500 hover:text-steel-700 px-2 py-1"
                    >
                      <ExternalLink size={14} />
                      View
                    </a>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
        <form
          onSubmit={onSubmit}
          className="grid gap-3 rounded-lg border border-steel-200 p-4 dark:border-dark-300 self-start"
        >
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">
              {editingSiteId ? 'Edit site' : 'New site'}
            </h2>
            {editingSiteId && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={cancelEditing}
                className="h-7 px-2 text-xs"
              >
                <X className="mr-1 size-3.5" />
                Cancel
              </Button>
            )}
          </div>
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
                    Public URL prefix: <code className="inline">{preview}</code>
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
                  <Input
                    id={id}
                    {...field}
                    value={field.value ?? ''}
                    placeholder="example.com"
                  />
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
                    value={field.value ?? ''}
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
            <legend className="font-medium mb-1">Languages</legend>
            {DEFAULT_SITE_LOCALES.map(locale => (
              <label key={locale.code} className="flex items-center gap-2">
                <Checkbox
                  checked={isLocaleSelected(locale.code)}
                  onCheckedChange={() => toggle(locale.code)}
                />
                {locale.label}
              </label>
            ))}
          </fieldset>
          <Controller
            name="defaultLocale"
            render={({ field, fieldState }) => {
              const id = useId();
              return (
                <FormItem>
                  <Label htmlFor={id}>Default language</Label>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger id={id}>
                      <SelectValue placeholder="Select default locale" />
                    </SelectTrigger>
                    <SelectContent>
                      {watchedLocales.map(locale => (
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
          <div className="flex items-center gap-2 pt-1">
            <Button
              type="submit"
              className="flex-1"
              disabled={pending || watchedLocales.length === 0}
            >
              {pending ? (
                <Loader2 className="mr-1.5 size-4 animate-spin" />
              ) : editingSiteId ? null : (
                <Plus className="mr-1.5 size-4" />
              )}
              {editingSiteId ? 'Save changes' : 'Create site'}
            </Button>
          </div>
        </form>
      </div>
    </FormProvider>
  );
}
