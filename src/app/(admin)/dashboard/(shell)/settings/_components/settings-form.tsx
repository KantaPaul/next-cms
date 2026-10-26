'use client';

import { Loader2, RotateCcw, Save } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  type FormEvent,
  type ReactNode,
  useMemo,
  useState,
  useTransition,
} from 'react';
import { toast } from 'sonner';
import { themeStyle } from '@/builder/theme';
import { MediaField } from '@/components/media/media-picker';
import { Button } from '@/components/ui/button';
import { PAGES } from '@/config/pages';
import {
  DEFAULT_THEME_TOKENS,
  type ThemeTokens,
} from '@/db/schemas/pages.schema';
import { cn } from '@/lib/utils/cn';
import { handleActionResponse } from '@/lib/utils/handle-action-response';
import { updateSiteSettings } from '../_modules/settings.actions';

type Settings = {
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
  themeTokens: ThemeTokens;
};

const FONTS: ThemeTokens['fontFamily'][] = [
  'Inter',
  'Plus Jakarta Sans',
  'JetBrains Mono',
  'System',
];
const RADII: ThemeTokens['borderRadius'][] = ['none', 'sm', 'md', 'lg', 'full'];
const MODES: ThemeTokens['colorMode'][] = ['light', 'dark', 'system'];

const inputClass =
  'h-9 w-full rounded-md border border-steel-200 bg-white px-3 text-sm dark:border-dark-300 dark:bg-dark-100';

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
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

/** Renders a `<label>` for single controls and a labelled group for composite ones like the media picker. */
function Field({
  label,
  hint,
  children,
  wide,
  group,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
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
}: {
  settings: Settings;
  menus: { id: string; title: string; location: string }[];
  fallbackSiteUrl: string;
}) {
  const router = useRouter();
  const [values, setValues] = useState<Settings>(settings);
  const [saved, setSaved] = useState(() => JSON.stringify(settings));
  const [isPending, startTransition] = useTransition();
  const dirty = useMemo(
    () => JSON.stringify(values) !== saved,
    [values, saved]
  );

  const set = <K extends keyof Settings>(key: K, value: Settings[K]) =>
    setValues(v => ({ ...v, [key]: value }));
  const setToken = <K extends keyof ThemeTokens>(
    key: K,
    value: ThemeTokens[K]
  ) =>
    setValues(v => ({ ...v, themeTokens: { ...v.themeTokens, [key]: value } }));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      await handleActionResponse(updateSiteSettings(values), () => {
        setSaved(JSON.stringify(values));
        toast.success('Settings saved. The public site has been refreshed.');
        router.refresh();
      });
    });
  };

  const menuSelect = (key: 'headerMenuId' | 'footerMenuId') => (
    <select
      className={inputClass}
      value={values[key] ?? ''}
      onChange={e => set(key, e.target.value || null)}
    >
      <option value="">None</option>
      {menus.map(menu => (
        <option key={menu.id} value={menu.id}>
          {menu.title} ({menu.location})
        </option>
      ))}
    </select>
  );

  return (
    <form onSubmit={submit} className="flex flex-col">
      <Section
        title="General"
        description="How the site identifies itself in titles, the footer, and search results."
      >
        <Field label="Site name">
          <input
            className={inputClass}
            value={values.siteName}
            onChange={e => set('siteName', e.target.value)}
            required
            maxLength={100}
          />
        </Field>
        <Field
          label="Site URL"
          hint={`Used for canonical links and the sitemap. Defaults to ${fallbackSiteUrl}.`}
        >
          <input
            className={inputClass}
            type="url"
            value={values.siteUrl ?? ''}
            onChange={e => set('siteUrl', e.target.value)}
            placeholder={fallbackSiteUrl}
          />
        </Field>
        <Field label="Description" wide>
          <textarea
            className={cn(inputClass, 'h-auto py-2')}
            rows={2}
            maxLength={500}
            value={values.siteDescription ?? ''}
            onChange={e => set('siteDescription', e.target.value)}
          />
        </Field>
      </Section>

      <Section
        title="Branding"
        description="Logo and icons from the media library. The default share image is used when a page has none."
      >
        <Field label="Logo" group>
          <MediaField
            value={values.logo ?? ''}
            onChange={url => set('logo', url)}
          />
        </Field>
        <Field label="Favicon" group>
          <MediaField
            value={values.favicon ?? ''}
            onChange={url => set('favicon', url)}
          />
        </Field>
        <Field label="Default share image" wide group>
          <MediaField
            value={values.defaultOgImage ?? ''}
            onChange={url => set('defaultOgImage', url)}
          />
        </Field>
      </Section>

      <Section
        title="Navigation"
        description="Pick which menus render in the public header and footer."
      >
        <Field label="Header menu">{menuSelect('headerMenuId')}</Field>
        <Field label="Footer menu">{menuSelect('footerMenuId')}</Field>
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
        <Field label="Primary colour" group>
          <ColorInput
            label="Primary colour"
            value={values.themeTokens.primaryColor}
            onChange={v => setToken('primaryColor', v)}
          />
        </Field>
        <Field label="Accent colour" group>
          <ColorInput
            label="Accent colour"
            value={values.themeTokens.accentColor}
            onChange={v => setToken('accentColor', v)}
          />
        </Field>
        <Field label="Font">
          <select
            className={inputClass}
            value={values.themeTokens.fontFamily}
            onChange={e =>
              setToken(
                'fontFamily',
                e.target.value as ThemeTokens['fontFamily']
              )
            }
          >
            {FONTS.map(f => (
              <option key={f}>{f}</option>
            ))}
          </select>
        </Field>
        <Field label="Corner radius" group>
          <div
            role="radiogroup"
            aria-label="Corner radius"
            className="flex gap-1"
          >
            {RADII.map(r => (
              <button
                key={r}
                type="button"
                role="radio"
                aria-checked={values.themeTokens.borderRadius === r}
                onClick={() => setToken('borderRadius', r)}
                className={cn(
                  'h-9 flex-1 rounded-md border text-xs capitalize transition',
                  values.themeTokens.borderRadius === r
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-200'
                    : 'border-steel-200 hover:border-steel-400 dark:border-dark-300'
                )}
              >
                {r}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Colour mode">
          <select
            className={inputClass}
            value={values.themeTokens.colorMode}
            onChange={e =>
              setToken('colorMode', e.target.value as ThemeTokens['colorMode'])
            }
          >
            {MODES.map(m => (
              <option key={m} value={m}>
                {m[0].toUpperCase() + m.slice(1)}
              </option>
            ))}
          </select>
        </Field>
        <div className="flex items-end">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => set('themeTokens', DEFAULT_THEME_TOKENS)}
          >
            <RotateCcw /> Reset theme
          </Button>
        </div>
        <ThemePreview tokens={values.themeTokens} siteName={values.siteName} />
      </Section>

      <Section
        title="SEO & analytics"
        description="Crawler rules and measurement. Leave robots.txt empty to use the default rules."
      >
        <Field
          label="Google Analytics ID"
          hint="GA4 measurement ID, for example G-ABC123XYZ."
        >
          <input
            className={inputClass}
            value={values.googleAnalyticsId ?? ''}
            onChange={e => set('googleAnalyticsId', e.target.value)}
            placeholder="G-XXXXXXXXXX"
          />
        </Field>
        <div />
        <Field label="Custom robots.txt" wide>
          <textarea
            className={cn(inputClass, 'h-auto py-2 font-mono text-xs')}
            rows={5}
            value={values.robotsTxt ?? ''}
            onChange={e => set('robotsTxt', e.target.value)}
            placeholder={'User-agent: *\nAllow: /\nDisallow: /dashboard'}
          />
        </Field>
      </Section>

      <div className="sticky bottom-0 z-10 -mx-5 flex items-center justify-end gap-3 border-t border-steel-100 bg-white/90 px-5 py-3 backdrop-blur xl:-mx-8 xl:px-8 dark:border-dark-300 dark:bg-dark-100/90">
        {dirty && (
          <span className="text-sm text-steel-500">
            You have unsaved changes
          </span>
        )}
        <Button
          type="button"
          variant="ghost"
          disabled={!dirty || isPending}
          onClick={() => setValues(JSON.parse(saved))}
        >
          Discard
        </Button>
        <Button type="submit" disabled={!dirty || isPending}>
          {isPending ? <Loader2 className="animate-spin" /> : <Save />} Save
          settings
        </Button>
      </div>
    </form>
  );
}

function ColorInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [text, setText] = useState(value);
  const [prev, setPrev] = useState(value);
  if (value !== prev) {
    setPrev(value);
    setText(value);
  }
  return (
    <div className="flex gap-2">
      <input
        type="color"
        aria-label={`${label} picker`}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="h-9 w-12 cursor-pointer rounded-md border border-steel-200 bg-white p-1 dark:border-dark-300 dark:bg-dark-100"
      />
      <input
        aria-label={`${label} hex value`}
        className={cn(inputClass, 'font-mono')}
        value={text}
        maxLength={7}
        onChange={e => {
          setText(e.target.value);
          if (/^#[0-9a-fA-F]{6}$/.test(e.target.value))
            onChange(e.target.value.toLowerCase());
        }}
      />
    </div>
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
