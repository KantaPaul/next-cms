'use client';

import { useId, useTransition, type FormEvent } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Loader2, RotateCcw, Save } from 'lucide-react';
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
      }
    > | null;
    themeTokens: ThemeTokens;
    videoSettings: { providers: Record<string, boolean> } | null;
  };
  menus: { id: string; title: string; location: string; language: string }[];
  fallbackSiteUrl: string;
  locales: { code: string; label: string }[];
  defaultLocale: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const form = useForm<SettingsInput>({
    resolver: zodResolver(settingsSchema),
    defaultValues: settings as SettingsInput,
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
          title="Navigation"
          description="Pick which menus render in the public header and footer."
        >
          {menuSelect('headerMenuId')}
          {menuSelect('footerMenuId')}
          <p className="text-xs text-steel-500 sm:col-span-2">
            Edit menu links in{' '}
            <Link
              href={PAGES.DASHBOARD.MENUS}
              className="font-medium text-indigo-600 hover:underline"
            >
              Menus
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
  return (
    <div className="sm:col-span-2">
      <span className="mb-1 block text-sm font-medium">Preview</span>
      <div
        style={{ ...themeStyle(tokens), fontFamily: 'var(--site-font)' }}
        className={cn(
          'rounded-lg border p-6',
          dark
            ? 'border-slate-700 bg-slate-900 text-slate-100'
            : 'border-steel-200 bg-white text-slate-900'
        )}
      >
        <p
          className="text-xs font-semibold uppercase tracking-wider"
          style={{ color: 'var(--site-accent)' }}
        >
          {siteName || 'Your site'}
        </p>
        <p className="mt-1 text-2xl font-bold">
          Ship pages your team is proud of.
        </p>
        <p
          className={cn(
            'mt-1 text-sm',
            dark ? 'text-slate-400' : 'text-slate-500'
          )}
        >
          Buttons, cards, and links follow these tokens.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <span
            className="px-4 py-2 text-sm font-semibold text-white"
            style={{
              background: 'var(--site-primary)',
              borderRadius: 'var(--site-radius)',
            }}
          >
            Primary action
          </span>
          <span
            className="border px-4 py-2 text-sm font-semibold"
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
