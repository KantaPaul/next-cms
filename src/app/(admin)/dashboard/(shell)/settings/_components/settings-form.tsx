'use client';

import { useId, useState, useTransition, type FormEvent } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Loader2, Plus, RotateCcw, Save, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { themeStyle } from '@/builder/theme';
import { MediaField } from '@/components/media/media-picker';
import { Button } from '@/components/ui/button';
import { PAGES } from '@/config/pages';
import { cn } from '@/lib/utils/cn';
import { handleActionResponse } from '@/lib/utils/handle-action-response';
import { updateSiteSettings, updateVideoSettings } from '../_modules/settings.actions';
import { useFormAction } from '@/hooks/use-form-action';
import { settingsSchema } from '../_modules/settings.schemas';
import { ColorInput } from '@/builder/controls/primitives';
import { DEFAULT_THEME_TOKENS, type ThemeTokens } from '@/db/schemas/pages.schema';
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

type SettingsInput = z.infer<typeof settingsSchema>;

const FONTS: ThemeTokens['fontFamily'][] = [
  'Inter',
  'Plus Jakarta Sans',
  'JetBrains Mono',
  'System',
];
const RADII: ThemeTokens['borderRadius'][] = ['none', 'sm', 'md', 'lg', 'full'];
const MODES: ThemeTokens['colorMode'][] = ['light', 'dark', 'system'];

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
      }
    > | null;
    themeTokens: ThemeTokens;
    videoSettings: { providers: Record<string, boolean> } | null;
  };
  menus: { id: string; title: string; location: string; language: string }[];
  templates?: { id: string; name: string; category: string }[];
  fallbackSiteUrl: string;
  locales: { code: string; label: string }[];
  defaultLocale: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

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

  const [customName, setCustomName] = useState('');
  const [customColor, setCustomColor] = useState('#8b5cf6');

  const addCustomToken = () => {
    if (!customName.trim()) {
      toast.error('Please enter a token name');
      return;
    }
    const currentTokens = form.getValues('themeTokens');
    const colors = currentTokens.colors ?? {};
    const custom = [...(colors.custom ?? [])];
    const id = customName.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-');
    if (custom.some(c => c.id === id)) {
      toast.error('A token with this name already exists');
      return;
    }
    custom.push({ id, name: customName.trim(), value: customColor });
    form.setValue('themeTokens', {
      ...currentTokens,
      colors: {
        ...colors,
        custom,
      },
    }, { shouldDirty: true });
    setCustomName('');
    toast.success(`Token "${customName.trim()}" added`);
  };

  const removeCustomToken = (id: string, name: string) => {
    const currentTokens = form.getValues('themeTokens');
    const colors = currentTokens.colors ?? {};
    const custom = (colors.custom ?? []).filter(c => c.id !== id);
    form.setValue('themeTokens', {
      ...currentTokens,
      colors: {
        ...colors,
        custom,
      },
    }, { shouldDirty: true });
    toast.info(`Token "${name}" removed. References will fall back to default.`);
  };

  const { submit: submitVideoSettings, isPending: videoSettingsPending } =
    useFormAction(
      async (data: { providers: Record<string, boolean> }) => {
        const result = await updateVideoSettings(data);
        return result as Record<string, unknown>;
      },
      {
        onSuccess: () => {
          toast.success('Video settings saved.');
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
            <Select
              id={id}
              {...field}
              className={inputClass}
            >
              <SelectTrigger>
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">None</SelectItem>
                {menus.map(menu => (
                  <SelectItem key={menu.id} value={menu.id}>
                    {menu.title} ({menu.location})
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
  );

  const templateSelect = (
    key: 'headerTemplateId' | 'footerTemplateId',
    filterCategory?: 'header' | 'footer'
  ) => {
    const relevant = templates.filter(
      t =>
        !filterCategory ||
        t.category.toLowerCase() === filterCategory.toLowerCase() ||
        t.category.toLowerCase() === 'general'
    );
    return (
      <Controller
        name={key}
        render={({ field, fieldState }) => {
          const id = useId();
          return (
            <FormItem>
              <Select
                id={id}
                value={field.value ?? ''}
                onChange={e => field.onChange(e.target.value || null)}
                className={inputClass}
              >
                <SelectTrigger>
                  <SelectValue placeholder="None (use menu layout)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None (use menu layout)</SelectItem>
                  {relevant.map(t => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name} ({t.category})
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
    );
  };

  const setToken = (key: keyof ThemeTokens, value: string | number) => {
    form.setValue('themeTokens', {
      ...form.getValues('themeTokens'),
      [key]: value,
    });
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
                  <Input id={id} {...field} required maxLength={100} />
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
                  <Input id={id} {...field} maxLength={160} />
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
                <FormItem wide>
                  <Label htmlFor={id}>Default SEO description</Label>
                  <textarea
                    id={id}
                    {...field}
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
                <FormItem wide>
                  <Label htmlFor={id}>Description</Label>
                  <textarea
                    id={id}
                    {...field}
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
              <FormItem group label="Logo">
                <MediaField
                  value={field.value}
                  onChange={url => field.onChange(url)}
                />
              </FormItem>
            )}
          />
          <Controller
            name="favicon"
            render={({ field }) => (
              <FormItem group label="Favicon">
                <MediaField value={field.value} onChange={url => field.onChange(url)} />
              </FormItem>
            )}
          />
          <Controller
            name="defaultOgImage"
            render={({ field }) => (
              <FormItem wide group label="Default share image">
                <MediaField value={field.value} onChange={url => field.onChange(url)} />
              </FormItem>
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
          <p className="text-xs text-steel-500 sm:col-span-2">
            Header and footer templates override the default menu navigation. Manage templates in{' '}
            <Link
              href={PAGES.DASHBOARD.TEMPLATES}
              className="font-medium text-indigo-600 hover:underline"
            >
              Templates
            </Link>
            .
          </p>
        </Section>

        <Section
          title="Theme"
          description="Design tokens applied to every public page and builder block."
        >
          <Controller
            name="themeTokens.primaryColor"
            render={({ field, fieldState }) => {
              const id = useId();
              return (
                <FormItem group label="Primary colour">
                  <ColorInput
                    label="Primary colour"
                    value={field.value}
                    onChange={v => field.onChange(v)}
                  />
                  {fieldState.error && (
                    <FormMessage>{fieldState.error.message}</FormMessage>
                  )}
                </FormItem>
              );
            }}
          />
          <Controller
            name="themeTokens.accentColor"
            render={({ field, fieldState }) => {
              const id = useId();
              return (
                <FormItem group label="Accent colour">
                  <ColorInput
                    label="Accent colour"
                    value={field.value}
                    onChange={v => field.onChange(v)}
                  />
                  {fieldState.error && (
                    <FormMessage>{fieldState.error.message}</FormMessage>
                  )}
                </FormItem>
              );
            }}
          />
          <Controller
            name="themeTokens.colors.secondary"
            render={({ field }) => (
              <FormItem group label="Secondary colour">
                <ColorInput
                  label="Secondary colour"
                  value={field.value ?? '#64748b'}
                  onChange={v => field.onChange(v)}
                />
              </FormItem>
            )}
          />
          <Controller
            name="themeTokens.colors.text"
            render={({ field }) => (
              <FormItem group label="Text colour">
                <ColorInput
                  label="Text colour"
                  value={field.value ?? '#0f172a'}
                  onChange={v => field.onChange(v)}
                />
              </FormItem>
            )}
          />
          <Controller
            name="themeTokens.colors.background"
            render={({ field }) => (
              <FormItem group label="Background colour">
                <ColorInput
                  label="Background colour"
                  value={field.value ?? '#ffffff'}
                  onChange={v => field.onChange(v)}
                />
              </FormItem>
            )}
          />
          <Controller
            name="themeTokens.colors.surface"
            render={({ field }) => (
              <FormItem group label="Surface colour">
                <ColorInput
                  label="Surface colour"
                  value={field.value ?? '#f8fafc'}
                  onChange={v => field.onChange(v)}
                />
              </FormItem>
            )}
          />
          <Controller
            name="themeTokens.colors.border"
            render={({ field }) => (
              <FormItem group label="Border colour">
                <ColorInput
                  label="Border colour"
                  value={field.value ?? '#e2e8f0'}
                  onChange={v => field.onChange(v)}
                />
              </FormItem>
            )}
          />
          <Controller
            name="themeTokens.fontFamily"
            render={({ field, fieldState }) => {
              const id = useId();
              return (
                <FormItem>
                  <Label htmlFor={id}>Font</Label>
                  <Select
                    id={id}
                    {...field}
                    className={inputClass}
                  >
                    {FONTS.map(f => (
                      <SelectItem key={f} value={f}>
                        {f}
                      </SelectItem>
                    ))}
                  </Select>
                  {fieldState.error && (
                    <FormMessage>{fieldState.error.message}</FormMessage>
                  )}
                </FormItem>
              );
            }}
          />
          <Controller
            name="themeTokens.borderRadius"
            render={({ field }) => {
              const id = useId();
              return (
                <FormItem group label="Corner radius">
                  <div role="radiogroup" aria-label="Corner radius" className="flex gap-1">
                    {RADII.map(r => (
                      <button
                        key={r}
                        type="button"
                        role="radio"
                        aria-checked={field.value === r}
                        onClick={() => field.onChange(r)}
                        className={cn(
                          'h-9 flex-1 rounded-md border text-xs capitalize transition',
                          field.value === r
                            ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-200'
                            : 'border-steel-200 hover:border-steel-400 dark:border-dark-300'
                        )}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </FormItem>
              );
            }}
          />
          <Controller
            name="themeTokens.colorMode"
            render={({ field, fieldState }) => {
              const id = useId();
              return (
                <FormItem>
                  <Label htmlFor={id}>Colour mode</Label>
                  <Select
                    id={id}
                    {...field}
                    className={inputClass}
                  >
                    {MODES.map(m => (
                      <SelectItem key={m} value={m}>
                        {m[0].toUpperCase() + m.slice(1)}
                      </SelectItem>
                    ))}
                  </Select>
                  {fieldState.error && (
                    <FormMessage>{fieldState.error.message}</FormMessage>
                  )}
                </FormItem>
              );
            }}
          />
          <div className="sm:col-span-2 rounded-lg border border-steel-200 dark:border-dark-300 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-semibold">Custom Design Tokens</h4>
                <p className="text-xs text-steel-500">
                  Reusable custom design tokens accessible across builder blocks.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              {(form.watch('themeTokens.colors.custom') ?? []).map(token => (
                <div
                  key={token.id}
                  className="flex items-center justify-between gap-3 p-2 rounded-md border border-steel-100 dark:border-dark-400 bg-steel-50/50 dark:bg-dark-200/50 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-4 h-4 rounded-full border border-black/10 shrink-0"
                      style={{ backgroundColor: token.value }}
                    />
                    <span className="font-medium">{token.name}</span>
                    <span className="font-mono text-steel-400">({token.value})</span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-red-500 hover:text-red-700"
                    onClick={() => removeCustomToken(token.id, token.name)}
                    title="Delete token"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
              {(form.watch('themeTokens.colors.custom') ?? []).length === 0 && (
                <p className="text-xs text-steel-400 italic">No custom tokens defined yet.</p>
              )}
            </div>

            <div className="flex flex-wrap items-end gap-2 pt-2 border-t border-steel-100 dark:border-dark-400">
              <div className="flex-1 min-w-[120px]">
                <Label className="text-xs">Token Name</Label>
                <Input
                  value={customName}
                  placeholder="e.g. Brand Highlight"
                  onChange={e => setCustomName(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
              <div className="w-32">
                <ColorInput
                  label="Color"
                  value={customColor}
                  onChange={setCustomColor}
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addCustomToken}
                className="h-8 gap-1 text-xs"
              >
                <Plus className="w-3.5 h-3.5" /> Add Token
              </Button>
            </div>
          </div>

          <div className="flex items-end">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => form.setValue('themeTokens', DEFAULT_THEME_TOKENS)}
            >
              <RotateCcw /> Reset theme
            </Button>
          </div>
          <Controller
            name="themeTokens"
            render={({ field }) => (
              <ThemePreview
                tokens={field.value as ThemeTokens}
                siteName={form.getValues('siteName')}
              />
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
              <FormItem group label="YouTube">
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
              </FormItem>
            )}
          />
          <Controller
            name="videoSettings.providers.vimeo"
            render={({ field }) => (
              <FormItem group label="Vimeo">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={field.value === true}
                    onChange={() => field.onChange(!field.value)}
                    className="rounded border-steel-300 text-indigo-600 focus:ring-indigo-500 dark:border-dark-300"
                  />
                  <span>Vimeo</span>
                </label>
              </FormItem>
            )}
          />
          <Controller
            name="videoSettings.providers.direct"
            render={({ field }) => (
              <FormItem group label="Direct MP4 / WebM">
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
              </FormItem>
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
          <Controller
            name="videoSettings"
            render={({ field }) => (
              <input type="hidden" {...field} />
            )}
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
                <FormItem label="Google Analytics ID" hint="GA4 measurement ID, for example G-ABC123XYZ.">
                  <Input id={id} {...field} placeholder="G-XXXXXXXXXX" maxLength={50} />
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
                <FormItem wide label="Custom robots.txt">
                  <textarea
                    id={id}
                    {...field}
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
                const copy =
                  form.getValues('translations')?.[locale.code] ?? {};
                const setCopy = (
                  key: 'siteName' | 'siteDescription' | 'seoTitle' | 'seoDescription',
                  value: string
                ) => {
                  form.setValue('translations', {
                    ...(form.getValues('translations') ?? {}),
                    [locale.code]: { ...copy, [key]: value },
                  });
                };
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
                            <Input id={id} {...f} />
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
                            <Input id={id} {...f} />
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
                            <Input id={id} {...f} className="w-full" />
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
                            <Input id={id} {...f} className="w-full" />
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
                            <Select
                              id={id}
                              value={f.value ?? ''}
                              onChange={e => f.onChange(e.target.value || null)}
                              className={inputClass}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Default (Inherit site setting)" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="">Default (Inherit site setting)</SelectItem>
                                {templates.map(t => (
                                  <SelectItem key={t.id} value={t.id}>
                                    {t.name} ({t.category})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
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
                            <Select
                              id={id}
                              value={f.value ?? ''}
                              onChange={e => f.onChange(e.target.value || null)}
                              className={inputClass}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Default (Inherit site setting)" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="">Default (Inherit site setting)</SelectItem>
                                {templates.map(t => (
                                  <SelectItem key={t.id} value={t.id}>
                                    {t.name} ({t.category})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
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

function ThemePreview({
  tokens,
  siteName,
}: {
  tokens: ThemeTokens;
  siteName: string;
}) {
  const dark = tokens.colorMode === 'dark';
  const customTokens = tokens.colors?.custom ?? [];

  return (
    <div className="sm:col-span-2">
      <span className="mb-1 block text-sm font-medium">Design System Preview</span>
      <div
        style={{ ...themeStyle(tokens), fontFamily: 'var(--site-font)' }}
        className={cn(
          'rounded-lg border p-6 space-y-6',
          dark
            ? 'border-slate-700 bg-slate-900 text-slate-100'
            : 'border-steel-200 bg-white text-slate-900'
        )}
      >
        <div>
          <p
            className="text-xs font-semibold uppercase tracking-wider"
            style={{ color: 'var(--site-accent)' }}
          >
            {siteName || 'Your site'} · Global Tokens
          </p>
          <h2 className="mt-1 text-2xl font-bold" style={{ fontSize: 'var(--site-type-h2-size, 1.75rem)' }}>
            Ship pages your team is proud of.
          </h2>
          <p
            className={cn(
              'mt-1 text-sm',
              dark ? 'text-slate-400' : 'text-slate-500'
            )}
            style={{ fontSize: 'var(--site-type-body-size, 1rem)' }}
          >
            Design tokens provide site-wide consistency for colors, typography, and dynamic data bindings.
          </p>
        </div>

        {/* Global Color Swatches */}
        <div>
          <span className="text-xs font-medium text-steel-500 block mb-2">Token Palette</span>
          <div className="flex flex-wrap gap-2 text-xs">
            <span
              className="px-3 py-1.5 rounded font-medium text-white shadow-sm"
              style={{ backgroundColor: 'var(--site-color-primary, #4f46e5)' }}
            >
              Primary
            </span>
            <span
              className="px-3 py-1.5 rounded font-medium text-white shadow-sm"
              style={{ backgroundColor: 'var(--site-color-accent, #0ea5e9)' }}
            >
              Accent
            </span>
            <span
              className="px-3 py-1.5 rounded font-medium text-white shadow-sm"
              style={{ backgroundColor: 'var(--site-color-secondary, #64748b)' }}
            >
              Secondary
            </span>
            <span
              className="px-3 py-1.5 rounded font-medium border"
              style={{
                backgroundColor: 'var(--site-color-surface, #f8fafc)',
                color: 'var(--site-color-text, #0f172a)',
                borderColor: 'var(--site-color-border, #e2e8f0)',
              }}
            >
              Surface
            </span>
            {customTokens.map(c => (
              <span
                key={c.id}
                className="px-3 py-1.5 rounded font-medium text-white shadow-sm"
                style={{ backgroundColor: `var(--site-token-${c.id.toLowerCase().replace(/[^a-z0-9_-]/g, '-')}, ${c.value})` }}
              >
                {c.name}
              </span>
            ))}
          </div>
        </div>

        {/* Interactive Components Demo */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
          <span
            className="px-4 py-2 text-sm font-semibold text-white cursor-pointer"
            style={{
              background: 'var(--site-primary)',
              borderRadius: 'var(--site-radius)',
            }}
          >
            Primary action
          </span>
          <span
            className="border px-4 py-2 text-sm font-semibold cursor-pointer"
            style={{
              borderColor: 'var(--site-primary)',
              color: 'var(--site-primary)',
              borderRadius: 'var(--site-radius)',
            }}
          >
            Secondary
          </span>
        </div>
      </div>
    </div>
  );
}
