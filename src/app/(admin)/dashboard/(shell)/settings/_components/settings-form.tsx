'use client';

import { useId, useState } from 'react';
import { useForm, FormProvider, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { AlertTriangle, Loader2, Plus, Save, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MediaField } from '@/components/media/media-picker';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PAGES } from '@/config/pages';
import { cn } from '@/lib/utils/cn';
import { updateSiteSettings } from '../_modules/settings.actions';
import { useFormAction } from '@/hooks/use-form-action';
import { settingsSchema } from '../_modules/settings.schemas';
import { type ThemeTokens, type AuthSettings } from '@/db/schemas/pages.schema';
import { FormInput as Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FormItem, FormMessage } from '@/components/ui/form';
import { siteTemplateEditHref } from '../../header-footer/_modules/site-template-href';

type SettingsInput = z.infer<typeof settingsSchema>;

const inputClass =
  'h-9 w-full rounded-md border border-steel-200 bg-transparent px-3 text-sm dark:border-dark-300 dark:bg-dark-100';

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="grid gap-4 border-b border-steel-100 py-6 first:pt-0 last:border-0 lg:grid-cols-[16rem_1fr] dark:border-dark-300">
      <header>
        <h3 className="text-base font-semibold">{title}</h3>
        <p className="mt-1 text-sm text-steel-500">{description}</p>
      </header>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function Field({
  label,
  hint,
  children,
  wide,
  group,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  wide?: boolean;
  group?: boolean;
}) {
  const className = cn('flex flex-col gap-1', wide && 'sm:col-span-2');
  const body = (
    <>
      <span className="text-sm font-medium">{label}</span>
      {children}
      {hint && <span className="text-xs text-steel-500">{hint}</span>}
    </>
  );
  return group ? (
    <div role="group" aria-label={label} className={className}>
      {body}
    </div>
  ) : (
    <label className={className}>{body}</label>
  );
}

/** Radix Select reserves the empty string, so "none" uses a sentinel and maps back to null. */
const NONE = '__none__';

function NullableSelect({
  id,
  value,
  onChange,
  noneLabel,
  options,
}: {
  id?: string;
  value: string | null | undefined;
  onChange: (value: string | null) => void;
  noneLabel: string;
  options: { value: string; label: string }[];
}) {
  return (
    <Select
      value={value || NONE}
      onValueChange={next => onChange(next === NONE ? null : next)}
    >
      <SelectTrigger id={id} className="w-full">
        <SelectValue placeholder={noneLabel} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE}>{noneLabel}</SelectItem>
        {options.map(option => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function SettingsForm({
  settings,
  menus,
  templates = [],
  fallbackSiteUrl,
  locales,
  defaultLocale,
}: {
  settings: {
    siteName: string;
    siteDescription: string | null;
    siteUrl: string | null;
    logo: string | null;
    favicon: string | null;
    defaultOgImage: string | null;
    headerMenuId: string | null;
    footerMenuId: string | null;
    headerTemplateId?: string | null;
    footerTemplateId?: string | null;
    searchTemplateId?: string | null;
    archiveTemplateId?: string | null;
    robotsTxt: string | null;
    googleAnalyticsId: string | null;
    seoTitle: string | null;
    seoDescription: string | null;
    translations: Record<
      string,
      {
        siteName?: string;
        siteDescription?: string;
        seoTitle?: string;
        seoDescription?: string;
        headerTemplateId?: string | null;
        footerTemplateId?: string | null;
        searchTemplateId?: string | null;
        archiveTemplateId?: string | null;
      }
    > | null;
    themeTokens?: ThemeTokens;
    videoSettings: { providers: Record<string, boolean> } | null;
    readingSettings?: {
      postNavigation?: 'auto' | 'off';
      comments?: boolean;
      share?: boolean;
      bookmark?: boolean;
    } | null;
    searchSettings?: {
      synonyms: Array<{ term: string; synonyms: string[] }>;
      pinnedResults: Array<{
        query: string;
        title: string;
        path: string;
        snippet?: string | null;
        kind?: 'page' | 'post' | 'collection' | 'video';
      }>;
    } | null;
    authSettings?: AuthSettings | null;
  };
  menus: { id: string; title: string; location: string; language: string }[];
  templates?: {
    id: string;
    name: string;
    category: string;
    kind: 'global' | 'page';
  }[];
  fallbackSiteUrl: string;
  locales: { code: string; label: string }[];
  defaultLocale: string;
}) {
  const router = useRouter();

  const form = useForm<SettingsInput>({
    resolver: zodResolver(settingsSchema) as any,
    defaultValues: settings as unknown as SettingsInput,
  });

  const { submit, isPending, error } = useFormAction(
    async (data: SettingsInput) => {
      const result = await updateSiteSettings(data);
      return result as Record<string, unknown>;
    },
    {
      onSuccess: () => {
        toast.success('Settings saved. The public site has been refreshed.');
        router.refresh();
      },
    }
  );

  const menuSelect = (key: 'headerMenuId' | 'footerMenuId') => (
    <Controller
      name={key}
      render={({ field, fieldState }) => {
        const id = useId();
        return (
          <FormItem>
            <NullableSelect
              id={id}
              value={field.value}
              onChange={field.onChange}
              noneLabel="None"
              options={menus.map(menu => ({
                value: menu.id,
                label: `${menu.title} (${menu.location})`,
              }))}
            />
            {fieldState.error && (
              <FormMessage>{fieldState.error.message}</FormMessage>
            )}
          </FormItem>
        );
      }}
    />
  );

  const [synonymTerm, setSynonymTerm] = useState('');
  const [synonymWords, setSynonymWords] = useState('');
  const [pinQuery, setPinQuery] = useState('');
  const [pinTitle, setPinTitle] = useState('');
  const [pinPath, setPinPath] = useState('');
  const [pinSnippet, setPinSnippet] = useState('');

  const addSynonymGroup = () => {
    const term = synonymTerm.trim().toLowerCase();
    const synonyms = synonymWords
      .split(',')
      .map(s => s.trim().toLowerCase())
      .filter(Boolean);
    if (!term || synonyms.length === 0) {
      toast.error('Enter a base term and at least one comma-separated synonym');
      return;
    }
    const current = form.getValues('searchSettings') ?? {
      synonyms: [],
      pinnedResults: [],
    };
    const nextSynonyms = [
      ...(current.synonyms ?? []).filter(item => item.term.toLowerCase() !== term),
      { term, synonyms },
    ];
    form.setValue(
      'searchSettings',
      {
        synonyms: nextSynonyms,
        pinnedResults: current.pinnedResults ?? [],
      },
      { shouldDirty: true }
    );
    setSynonymTerm('');
    setSynonymWords('');
    toast.success(`Synonym rule for "${term}" added`);
  };

  const removeSynonymGroup = (term: string) => {
    const current = form.getValues('searchSettings') ?? {
      synonyms: [],
      pinnedResults: [],
    };
    form.setValue(
      'searchSettings',
      {
        synonyms: (current.synonyms ?? []).filter(item => item.term !== term),
        pinnedResults: current.pinnedResults ?? [],
      },
      { shouldDirty: true }
    );
  };

  const addPinnedResult = () => {
    const query = pinQuery.trim().toLowerCase();
    const title = pinTitle.trim();
    const path = pinPath.trim();
    if (!query || !title || !path) {
      toast.error('Query, title, and path are required for a pinned result');
      return;
    }
    const current = form.getValues('searchSettings') ?? {
      synonyms: [],
      pinnedResults: [],
    };
    form.setValue(
      'searchSettings',
      {
        synonyms: current.synonyms ?? [],
        pinnedResults: [
          ...(current.pinnedResults ?? []),
          {
            query,
            title,
            path,
            snippet: pinSnippet.trim() || null,
            kind: 'page' as const,
          },
        ],
      },
      { shouldDirty: true }
    );
    setPinQuery('');
    setPinTitle('');
    setPinPath('');
    setPinSnippet('');
    toast.success(`Pinned result for "${query}" added`);
  };

  const removePinnedResult = (index: number) => {
    const current = form.getValues('searchSettings') ?? {
      synonyms: [],
      pinnedResults: [],
    };
    form.setValue(
      'searchSettings',
      {
        synonyms: current.synonyms ?? [],
        pinnedResults: (current.pinnedResults ?? []).filter((_, i) => i !== index),
      },
      { shouldDirty: true }
    );
  };

  const templateSelect = (
    key:
      | 'headerTemplateId'
      | 'footerTemplateId'
      | 'searchTemplateId'
      | 'archiveTemplateId',
    filterCategory: 'header' | 'footer' | 'search' | 'archive',
    noneLabel = 'None (use menu layout)'
  ) => {
    // Header/footer pick global blocks of their own category; search and
    // archive also accept page templates, which /search and archives render too.
    const matches = (t: (typeof templates)[number]) => {
      const category = t.category.toLowerCase();
      if (t.kind === 'page') {
        return filterCategory === 'search' || filterCategory === 'archive';
      }
      return category === filterCategory || category === 'general';
    };
    return (
      <Controller
        name={key}
        render={({ field, fieldState }) => {
          const id = useId();
          // Keep a saved choice visible even if it no longer matches the filter.
          const relevant = templates.filter(
            t => matches(t) || t.id === field.value
          );
          const selected = templates.find(t => t.id === field.value);
          return (
            <FormItem>
              <div className="flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <NullableSelect
                    id={id}
                    value={field.value}
                    onChange={field.onChange}
                    noneLabel={noneLabel}
                    options={relevant.map(t => ({ value: t.id, label: t.name }))}
                  />
                </div>
                {selected && (
                  <Link
                    href={
                      selected.kind === 'page'
                        ? PAGES.DASHBOARD.TEMPLATE(selected.id)
                        : siteTemplateEditHref(selected.id, selected.category)
                    }
                    target="_blank"
                    className="text-xs font-medium text-indigo-600 hover:underline shrink-0"
                  >
                    Edit
                  </Link>
                )}
              </div>
              {fieldState.error && (
                <FormMessage>{fieldState.error.message}</FormMessage>
              )}
            </FormItem>
          );
        }}
      />
    );
  };

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit((data) => submit(data as unknown as SettingsInput))} className="flex flex-col">
        <Section
          title="General"
          description="How the site identifies itself in titles, the footer, and search results."
        >
          <Controller
            name="siteName"
            render={({ field, fieldState }) => {
              const id = useId();
              return (
                <FormItem>
                  <Label htmlFor={id}>Site name</Label>
                  <Input id={id} {...field} value={field.value ?? ''} required maxLength={100} />
                  {fieldState.error && (
                    <FormMessage>{fieldState.error.message}</FormMessage>
                  )}
                </FormItem>
              );
            }}
          />
          <Controller
            name="siteUrl"
            render={({ field, fieldState }) => {
              const id = useId();
              return (
                <FormItem>
                  <Label htmlFor={id}>Site URL</Label>
                  <Input
                    id={id}
                    {...field}
                    value={field.value ?? ''}
                    type="url"
                    placeholder={fallbackSiteUrl}
                    maxLength={255}
                  />
                  {fieldState.error && (
                    <FormMessage>{fieldState.error.message}</FormMessage>
                  )}
                </FormItem>
              );
            }}
          />
          <Controller
            name="seoTitle"
            render={({ field, fieldState }) => {
              const id = useId();
              return (
                <FormItem>
                  <Label htmlFor={id}>Default SEO title</Label>
                  <Input id={id} {...field} value={field.value ?? ''} maxLength={160} />
                  {fieldState.error && (
                    <FormMessage>{fieldState.error.message}</FormMessage>
                  )}
                </FormItem>
              );
            }}
          />
          <Controller
            name="seoDescription"
            render={({ field, fieldState }) => {
              const id = useId();
              return (
                <FormItem className="sm:col-span-2">
                  <Label htmlFor={id}>Default SEO description</Label>
                  <textarea
                    id={id}
                    {...field}
                    value={field.value ?? ''}
                    rows={2}
                    maxLength={300}
                    className={cn(inputClass, 'h-auto py-2')}
                  />
                  {fieldState.error && (
                    <FormMessage>{fieldState.error.message}</FormMessage>
                  )}
                </FormItem>
              );
            }}
          />
          <Controller
            name="siteDescription"
            render={({ field, fieldState }) => {
              const id = useId();
              return (
                <FormItem className="sm:col-span-2">
                  <Label htmlFor={id}>Description</Label>
                  <textarea
                    id={id}
                    {...field}
                    value={field.value ?? ''}
                    rows={2}
                    maxLength={500}
                    className={cn(inputClass, 'h-auto py-2')}
                  />
                  {fieldState.error && (
                    <FormMessage>{fieldState.error.message}</FormMessage>
                  )}
                </FormItem>
              );
            }}
          />
        </Section>

        <Section
          title="Branding"
          description="Logo and icons from the media library. The default share image is used when a page has none."
        >
          <Controller
            name="logo"
            render={({ field }) => (
              <Field group label="Logo">
                <MediaField
                  value={field.value}
                  onChange={url => field.onChange(url)}
                />
              </Field>
            )}
          />
          <Controller
            name="favicon"
            render={({ field }) => (
              <Field group label="Favicon">
                <MediaField value={field.value} onChange={url => field.onChange(url)} />
              </Field>
            )}
          />
          <Controller
            name="defaultOgImage"
            render={({ field }) => (
              <Field wide group label="Default share image">
                <MediaField value={field.value} onChange={url => field.onChange(url)} />
              </Field>
            )}
          />
        </Section>

        <Section
          title="Navigation & Templates"
          description="Pick which menus or visual builder templates render in the public header and footer."
        >
          <div className="space-y-1">
            <span className="text-xs font-semibold text-steel-700">Header Menu</span>
            {menuSelect('headerMenuId')}
          </div>
          <div className="space-y-1">
            <span className="text-xs font-semibold text-steel-700">Footer Menu</span>
            {menuSelect('footerMenuId')}
          </div>
          <div className="space-y-1">
            <span className="text-xs font-semibold text-steel-700">
              Header Template (visual builder)
            </span>
            {templateSelect('headerTemplateId', 'header')}
          </div>
          <div className="space-y-1">
            <span className="text-xs font-semibold text-steel-700">
              Footer Template (visual builder)
            </span>
            {templateSelect('footerTemplateId', 'footer')}
          </div>
          <div className="space-y-1">
            <span className="text-xs font-semibold text-steel-700">
              Search Results Template (visual builder)
            </span>
            {templateSelect(
              'searchTemplateId',
              'search',
              'None (use default search layout)'
            )}
          </div>
          <div className="space-y-1">
            <span className="text-xs font-semibold text-steel-700">
              Archive Template (categories, tags, authors, dates)
            </span>
            {templateSelect(
              'archiveTemplateId',
              'archive',
              'None (use default archive layout)'
            )}
          </div>
          <p className="text-xs text-steel-500 sm:col-span-2">
            Header, footer, search, and archive templates override the default layouts. Create and edit them in{' '}
            <Link
              href={PAGES.DASHBOARD.HEADER_FOOTER}
              className="font-medium text-indigo-600 hover:underline"
            >
              Site templates
            </Link>
            .
          </p>
        </Section>

        <Section
          title="Site Search (Synonyms & Pinned Results)"
          description="Configure query synonyms and pinned featured results for the public site search."
        >
          <div className="sm:col-span-2 rounded-lg border border-steel-200 dark:border-dark-300 p-4 space-y-3">
            <div>
              <h4 className="text-sm font-semibold">Search Synonyms</h4>
              <p className="text-xs text-steel-500">
                Expand user queries with equivalent terms (e.g. &ldquo;cms&rdquo; &rarr; &ldquo;builder, editor&rdquo;).
              </p>
            </div>
            <div className="space-y-2">
              {(form.watch('searchSettings.synonyms') ?? []).map(item => (
                <div
                  key={item.term}
                  className="flex items-center justify-between gap-3 p-2 rounded-md border border-steel-100 dark:border-dark-400 bg-steel-50/50 dark:bg-dark-200/50 text-xs"
                >
                  <div>
                    <span className="font-semibold">{item.term}</span>
                    <span className="mx-1.5 text-steel-400">&rarr;</span>
                    <span className="text-steel-600 dark:text-steel-300">
                      {item.synonyms.join(', ')}
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-red-500 hover:text-red-700"
                    onClick={() => removeSynonymGroup(item.term)}
                    title="Delete synonym rule"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
              {(form.watch('searchSettings.synonyms') ?? []).length === 0 && (
                <p className="text-xs text-steel-400 italic">No search synonyms configured.</p>
              )}
            </div>
            <div className="flex flex-wrap items-end gap-2 pt-2 border-t border-steel-100 dark:border-dark-400">
              <div className="w-40">
                <Label className="text-xs">Term</Label>
                <Input
                  value={synonymTerm}
                  placeholder="e.g. pricing"
                  onChange={e => setSynonymTerm(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
              <div className="flex-1 min-w-[160px]">
                <Label className="text-xs">Synonyms (comma-separated)</Label>
                <Input
                  value={synonymWords}
                  placeholder="e.g. plans, cost, billing"
                  onChange={e => setSynonymWords(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addSynonymGroup}
                className="h-8 gap-1 text-xs"
              >
                <Plus className="w-3.5 h-3.5" /> Add Synonym
              </Button>
            </div>
          </div>

          <div className="sm:col-span-2 rounded-lg border border-steel-200 dark:border-dark-300 p-4 space-y-3">
            <div>
              <h4 className="text-sm font-semibold">Pinned Search Results</h4>
              <p className="text-xs text-steel-500">
                Pin specific pages or links to the top of results when a visitor searches for a matching query.
              </p>
            </div>
            <div className="space-y-2">
              {(form.watch('searchSettings.pinnedResults') ?? []).map((item, idx) => (
                <div
                  key={`${item.query}-${item.path}-${idx}`}
                  className="flex items-center justify-between gap-3 p-2 rounded-md border border-steel-100 dark:border-dark-400 bg-steel-50/50 dark:bg-dark-200/50 text-xs"
                >
                  <div className="min-w-0">
                    <span className="inline-block rounded bg-amber-100 px-1.5 py-0.5 font-mono text-[11px] text-amber-800 mr-2">
                      {item.query}
                    </span>
                    <span className="font-semibold">{item.title}</span>
                    <span className="ml-2 text-steel-400">({item.path})</span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-red-500 hover:text-red-700"
                    onClick={() => removePinnedResult(idx)}
                    title="Delete pinned result"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
              {(form.watch('searchSettings.pinnedResults') ?? []).length === 0 && (
                <p className="text-xs text-steel-400 italic">No pinned search results configured.</p>
              )}
            </div>
            <div className="grid gap-2 pt-2 border-t border-steel-100 dark:border-dark-400 sm:grid-cols-3">
              <div>
                <Label className="text-xs">Trigger Query</Label>
                <Input
                  value={pinQuery}
                  placeholder="e.g. contact"
                  onChange={e => setPinQuery(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
              <div>
                <Label className="text-xs">Result Title</Label>
                <Input
                  value={pinTitle}
                  placeholder="e.g. Contact Support"
                  onChange={e => setPinTitle(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
              <div>
                <Label className="text-xs">Target Path</Label>
                <Input
                  value={pinPath}
                  placeholder="e.g. /contact"
                  onChange={e => setPinPath(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
              <div className="sm:col-span-2">
                <Label className="text-xs">Snippet (optional)</Label>
                <Input
                  value={pinSnippet}
                  placeholder="Short description shown on the pinned card"
                  onChange={e => setPinSnippet(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
              <div className="flex items-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addPinnedResult}
                  className="h-8 w-full gap-1 text-xs"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Pinned Result
                </Button>
              </div>
            </div>
          </div>
        </Section>

        <Section
          title="Single pages"
          description="How blog posts and post-type entries behave on the public site."
        >
          <Controller
            name="readingSettings.postNavigation"
            render={({ field }) => (
              <Field group label="Previous / next links">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={field.value !== 'off'}
                    onChange={() => field.onChange(field.value === 'off' ? 'auto' : 'off')}
                    className="rounded border-steel-300 text-indigo-600 focus:ring-indigo-500 dark:border-dark-300"
                  />
                  <span>Show previous / next links on every single page</span>
                </label>
                <p className="text-xs text-steel-500">
                  Added after the content when a template doesn&apos;t already include the Previous / next block.
                </p>
              </Field>
            )}
          />
          <Controller
            name="readingSettings.share"
            render={({ field }) => (
              <Field group label="Share buttons">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={field.value !== false}
                    onChange={() => field.onChange(field.value === false)}
                    className="rounded border-steel-300 text-indigo-600 focus:ring-indigo-500 dark:border-dark-300"
                  />
                  <span>Show share buttons on every single page</span>
                </label>
                <p className="text-xs text-steel-500">
                  Copy link, X, LinkedIn and email, under the content. Templates that already include the block keep their own.
                </p>
              </Field>
            )}
          />
          <Controller
            name="readingSettings.bookmark"
            render={({ field }) => (
              <Field group label="Bookmark">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={field.value !== false}
                    onChange={() => field.onChange(field.value === false)}
                    className="rounded border-steel-300 text-indigo-600 focus:ring-indigo-500 dark:border-dark-300"
                  />
                  <span>Show a bookmark (save for later) button on every single page</span>
                </label>
                <p className="text-xs text-steel-500">
                  Saved items are kept in the visitor’s browser and listed by the Bookmarks block. Templates that already include the block keep their own.
                </p>
              </Field>
            )}
          />
          <Controller
            name="readingSettings.comments"
            render={({ field }) => (
              <Field group label="Comments">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={field.value !== false}
                    onChange={() => field.onChange(field.value === false)}
                    className="rounded border-steel-300 text-indigo-600 focus:ring-indigo-500 dark:border-dark-300"
                  />
                  <span>Allow comments on blog posts</span>
                </label>
                <p className="text-xs text-steel-500">
                  Each post can still switch comments off. New comments wait for approval under Comments.
                </p>
              </Field>
            )}
          />
        </Section>

        <Section
          title="Video library"
          description="Enable or disable video providers. Disabling a provider rejects new URLs for that provider; saved videos render an unavailable state."
        >
          <Controller
            name="videoSettings.providers.youtube"
            render={({ field }) => (
              <Field group label="YouTube">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={field.value === true}
                    onChange={() => field.onChange(!field.value)}
                    className="rounded border-steel-300 text-indigo-600 focus:ring-indigo-500 dark:border-dark-300"
                  />
                  <span>YouTube</span>
                </label>
                <p className="text-xs text-steel-500">
                  Embeds use www.youtube-nocookie.com. Duration is a manual field.
                </p>
              </Field>
            )}
          />
          <Controller
            name="videoSettings.providers.vimeo"
            render={({ field }) => (
              <Field group label="Vimeo">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={field.value === true}
                    onChange={() => field.onChange(!field.value)}
                    className="rounded border-steel-300 text-indigo-600 focus:ring-indigo-500 dark:border-dark-300"
                  />
                  <span>Vimeo</span>
                </label>
              </Field>
            )}
          />
          <Controller
            name="videoSettings.providers.direct"
            render={({ field }) => (
              <Field group label="Direct MP4 / WebM">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={field.value === true}
                    onChange={() => field.onChange(!field.value)}
                    className="rounded border-steel-300 text-indigo-600 focus:ring-indigo-500 dark:border-dark-300"
                  />
                  <span>Direct files</span>
                </label>
                <p className="text-xs text-steel-500">
                  HTTPS .mp4 / .webm URLs only. Native player, no uploads.
                </p>
              </Field>
            )}
          />
          <div className="flex items-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                const next = {
                  youtube: true,
                  vimeo: true,
                  direct: true,
                };
                form.setValue('videoSettings', { providers: next });
              }}
            >
              Enable all
            </Button>
          </div>
        </Section>

        <Section
          title="Authentication & access"
          description="Configure login visibility, registration rules, session durations, and account security."
        >
          <Controller
            name="authSettings.loginEnabled"
            render={({ field }) => (
              <Field group label="Login availability" wide>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={field.value !== false}
                    onChange={() => field.onChange(field.value === false ? true : false)}
                    className="rounded border-steel-300 text-indigo-600 focus:ring-indigo-500 dark:border-dark-300"
                  />
                  <span className="font-medium text-sm">Enable login</span>
                </label>
                <p className="text-xs text-steel-500">
                  When turned off, the login form and sign-in routes refuse requests.
                </p>
                {field.value === false && (
                  <div className="mt-2 flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-700/50 dark:bg-amber-950/40 dark:text-amber-200">
                    <AlertTriangle className="size-4 shrink-0 text-amber-600 mt-0.5" />
                    <div>
                      <strong>Warning:</strong> Turning login off blocks all incoming sign-ins. If you log out and need to re-enable login, run this command on the server:
                      <code className="mt-1 block rounded bg-amber-100/80 px-1.5 py-0.5 font-mono text-[11px] text-amber-950 dark:bg-amber-900/60 dark:text-amber-100">
                        npm run auth:enable-login
                      </code>
                    </div>
                  </div>
                )}
              </Field>
            )}
          />

          <Controller
            name="authSettings.loginDisabledMessage"
            render={({ field }) => (
              <Field label="Login disabled message" wide hint="Message shown to visitors when login is disabled.">
                <Input
                  {...field}
                  value={field.value ?? ''}
                  placeholder="Login is currently disabled."
                />
              </Field>
            )}
          />

          <Controller
            name="authSettings.publicRegistrationEnabled"
            render={({ field }) => (
              <Field group label="Public registration">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={field.value !== false}
                    onChange={() => field.onChange(field.value === false ? true : false)}
                    className="rounded border-steel-300 text-indigo-600 focus:ring-indigo-500 dark:border-dark-300"
                  />
                  <span>Allow new user registration</span>
                </label>
                <p className="text-xs text-steel-500">
                  When disabled, only existing users can sign in. New accounts cannot be created.
                </p>
              </Field>
            )}
          />

          <Controller
            name="authSettings.requireAdminApproval"
            render={({ field }) => (
              <Field group label="Admin approval">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={field.value === true}
                    onChange={() => field.onChange(!field.value)}
                    className="rounded border-steel-300 text-indigo-600 focus:ring-indigo-500 dark:border-dark-300"
                  />
                  <span>Require admin approval</span>
                </label>
                <p className="text-xs text-steel-500">
                  New users start as inactive until an administrator approves them in Users &amp; Roles.
                </p>
              </Field>
            )}
          />

          <Controller
            name="authSettings.requireEmailVerification"
            render={({ field }) => (
              <Field group label="Email verification">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={field.value === true}
                    onChange={() => field.onChange(!field.value)}
                    className="rounded border-steel-300 text-indigo-600 focus:ring-indigo-500 dark:border-dark-300"
                  />
                  <span>Require verified email</span>
                </label>
                <p className="text-xs text-steel-500">
                  Users must have a verified email address to establish an active session.
                </p>
              </Field>
            )}
          />

          <Field label="Default role" hint="Fixed role assigned to all new sign-ins.">
            <div className="flex h-9 items-center gap-2">
              <Badge variant="secondary" className="px-2.5 py-1 text-xs font-semibold">
                Viewer
              </Badge>
              <span className="text-xs text-steel-500">
                (Fixed default role; not customizable)
              </span>
            </div>
          </Field>

          <Controller
            name="authSettings.sessionLifetimeHours"
            render={({ field }) => {
              const id = useId();
              return (
                <Field label="Session lifetime" hint="How long an authenticated session remains valid before re-login.">
                  <Select
                    value={String(field.value ?? 720)}
                    onValueChange={v => field.onChange(Number(v))}
                  >
                    <SelectTrigger id={id} className={inputClass}>
                      <SelectValue placeholder="Choose session duration" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="24">24 hours (1 day)</SelectItem>
                      <SelectItem value="168">168 hours (7 days)</SelectItem>
                      <SelectItem value="720">720 hours (30 days)</SelectItem>
                      <SelectItem value="2160">2160 hours (90 days)</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              );
            }}
          />

          <Controller
            name="authSettings.maxFailedAttempts"
            render={({ field }) => {
              const id = useId();
              return (
                <Field label="Failed login attempts" hint="Number of consecutive failed attempts before account lockout.">
                  <Select
                    value={String(field.value ?? 5)}
                    onValueChange={v => field.onChange(Number(v))}
                  >
                    <SelectTrigger id={id} className={inputClass}>
                      <SelectValue placeholder="Attempts before lockout" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3">3 attempts</SelectItem>
                      <SelectItem value="5">5 attempts</SelectItem>
                      <SelectItem value="10">10 attempts</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              );
            }}
          />

          <Controller
            name="authSettings.lockoutMinutes"
            render={({ field }) => {
              const id = useId();
              return (
                <Field label="Lockout duration" hint="How long an account remains locked after reaching attempt limit.">
                  <Select
                    value={String(field.value ?? 15)}
                    onValueChange={v => field.onChange(Number(v))}
                  >
                    <SelectTrigger id={id} className={inputClass}>
                      <SelectValue placeholder="Lockout duration" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5 minutes</SelectItem>
                      <SelectItem value="15">15 minutes</SelectItem>
                      <SelectItem value="30">30 minutes</SelectItem>
                      <SelectItem value="60">60 minutes</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              );
            }}
          />
        </Section>

        <Section
          title="SEO & analytics"
          description="Crawler rules and measurement. Leave robots.txt empty to use the default rules."
        >
          <Controller
            name="googleAnalyticsId"
            render={({ field, fieldState }) => {
              const id = useId();
              return (
                <FormItem>
                  <Label htmlFor={id}>Google Analytics ID</Label>
                  <Input id={id} {...field} value={field.value ?? ''} placeholder="G-XXXXXXXXXX" maxLength={50} />
                  <span className="text-xs text-steel-500">GA4 measurement ID, for example G-ABC123XYZ.</span>
                  {fieldState.error && (
                    <FormMessage>{fieldState.error.message}</FormMessage>
                  )}
                </FormItem>
              );
            }}
          />
          <div />
          <Controller
            name="robotsTxt"
            render={({ field, fieldState }) => {
              const id = useId();
              return (
                <FormItem className="sm:col-span-2">
                  <Label htmlFor={id}>Custom robots.txt</Label>
                  <textarea
                    id={id}
                    {...field}
                    value={field.value ?? ''}
                    rows={5}
                    className={cn(inputClass, 'h-auto py-2 font-mono text-xs')}
                    placeholder="User-agent: *\nAllow: /\nDisallow: /dashboard"
                    maxLength={5000}
                  />
                  {fieldState.error && (
                    <FormMessage>{fieldState.error.message}</FormMessage>
                  )}
                </FormItem>
              );
            }}
          />
        </Section>
        {locales.filter(locale => locale.code !== defaultLocale).length > 0 && (
          <Section
            title="Other languages"
            description="Name, description, and default SEO for each language besides the default. Blank fields fall back to the main values."
          >
            {locales
              .filter(locale => locale.code !== defaultLocale)
              .map(locale => {
                return (
                  <div key={locale.code} className="grid gap-3 sm:col-span-2 sm:grid-cols-2">
                    <p className="sm:col-span-2 text-sm font-medium">
                      {locale.label}
                    </p>
                    <Controller
                      name={`translations.${locale.code}.siteName`}
                      render={({ field: f, fieldState }) => {
                        const id = useId();
                        return (
                          <>
                            <Label htmlFor={id}>Site name</Label>
                            <Input id={id} {...f} value={f.value ?? ''} />
                            {fieldState.error && (
                              <FormMessage>{fieldState.error.message}</FormMessage>
                            )}
                          </>
                        );
                      }}
                    />
                    <Controller
                      name={`translations.${locale.code}.seoTitle`}
                      render={({ field: f, fieldState }) => {
                        const id = useId();
                        return (
                          <>
                            <Label htmlFor={id}>SEO title</Label>
                            <Input id={id} {...f} value={f.value ?? ''} />
                            {fieldState.error && (
                              <FormMessage>{fieldState.error.message}</FormMessage>
                            )}
                          </>
                        );
                      }}
                    />
                    <Controller
                      name={`translations.${locale.code}.siteDescription`}
                      render={({ field: f, fieldState }) => {
                        const id = useId();
                        return (
                          <>
                            <Label htmlFor={id}>Description</Label>
                            <Input id={id} {...f} value={f.value ?? ''} className="w-full" />
                            {fieldState.error && (
                              <FormMessage>{fieldState.error.message}</FormMessage>
                            )}
                          </>
                        );
                      }}
                    />
                    <Controller
                      name={`translations.${locale.code}.seoDescription`}
                      render={({ field: f, fieldState }) => {
                        const id = useId();
                        return (
                          <>
                            <Label htmlFor={id}>SEO description</Label>
                            <Input id={id} {...f} value={f.value ?? ''} className="w-full" />
                            {fieldState.error && (
                              <FormMessage>{fieldState.error.message}</FormMessage>
                            )}
                          </>
                        );
                      }}
                    />
                    <Controller
                      name={`translations.${locale.code}.headerTemplateId`}
                      render={({ field: f }) => {
                        const id = useId();
                        return (
                          <div>
                            <Label htmlFor={id}>Header Template ({locale.label})</Label>
                            <NullableSelect
                              id={id}
                              value={f.value}
                              onChange={f.onChange}
                              noneLabel="Default (inherit site setting)"
                              options={templates.map(t => ({ value: t.id, label: t.name }))}
                            />
                          </div>
                        );
                      }}
                    />
                    <Controller
                      name={`translations.${locale.code}.footerTemplateId`}
                      render={({ field: f }) => {
                        const id = useId();
                        return (
                          <div>
                            <Label htmlFor={id}>Footer Template ({locale.label})</Label>
                            <NullableSelect
                              id={id}
                              value={f.value}
                              onChange={f.onChange}
                              noneLabel="Default (inherit site setting)"
                              options={templates.map(t => ({ value: t.id, label: t.name }))}
                            />
                          </div>
                        );
                      }}
                    />
                  </div>
                );
              })}
          </Section>
        )}

        <div className="sticky bottom-0 z-10 -mx-5 flex items-center justify-end gap-3 border-t border-steel-100 bg-white/90 px-5 py-3 backdrop-blur xl:-mx-8 xl:px-8 dark:border-dark-300 dark:bg-dark-100/90">
          {form.formState.isDirty && (
            <span className="text-sm text-steel-500">
              You have unsaved changes
            </span>
          )}
          <Button
            type="button"
            variant="ghost"
            disabled={!form.formState.isDirty || isPending}
            onClick={() => form.reset(settings as SettingsInput)}
          >
            Discard
          </Button>
          <Button type="submit" disabled={!form.formState.isDirty || isPending}>
            {isPending ? <Loader2 className="animate-spin" /> : <Save />} Save
            settings
          </Button>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      </form>
    </FormProvider>
  );
}
