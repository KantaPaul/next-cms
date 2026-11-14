'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  AlertTriangle,
  Loader2,
  Pencil,
  Plus,
  RotateCcw,
  Save,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useId, useState } from 'react';
import { Controller, FormProvider, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { ColorInput } from '@/builder/controls/primitives';
import { themeStyle } from '@/builder/theme';
import { THEME_PRESETS } from '@/builder/theme-presets';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { FormItem, FormMessage } from '@/components/ui/form';
import { FormInput as Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DEFAULT_THEME_TOKENS,
  type ThemeTokens,
} from '@/db/schemas/pages.schema';
import { useFormAction } from '@/hooks/use-form-action';
import { cn } from '@/lib/utils/cn';
import {
  installQuietEditorial,
  updateCustomFonts,
  updateThemeSettings,
} from '../../settings/_modules/settings.actions';
import type { CustomFont, CustomFontWeight } from '@/builder/fonts';
import { MediaPickerDialog } from '@/components/media/media-picker';
import {
  type ThemeFormInput,
  themeFormSchema,
} from '../../settings/_modules/settings.schemas';

const FONTS: ThemeTokens['fontFamily'][] = [
  'Inter',
  'Plus Jakarta Sans',
  'Manrope',
  'JetBrains Mono',
  'System',
];
/** Heading font choices: serif display faces first, then the body fonts. */
const HEADING_FONTS = [
  'Newsreader',
  'Fraunces',
  'Instrument Serif',
  'Playfair Display',
  'Lora',
  'Merriweather',
  'Inter',
  'Plus Jakarta Sans',
  'Manrope',
  'DM Sans',
  'Space Grotesk',
];
const SAME_AS_BODY = '__body__';

/** Extra light-mode colours, after the original seven. */
const EXTRA_COLORS = [
  { key: 'textMuted', label: 'Muted text colour', fallback: '#64748b' },
  { key: 'surfaceAlt', label: 'Alternate surface', fallback: '#f1f5f9' },
  { key: 'primarySoft', label: 'Primary tint', fallback: '#eef2ff' },
] as const;

/** Dark-mode palette. Empty = the built-in dark colours. */
const DARK_COLORS = [
  { key: 'primary', label: 'Primary', fallback: '#818cf8' },
  { key: 'text', label: 'Text', fallback: '#e2e8f0' },
  { key: 'textMuted', label: 'Muted text', fallback: '#94a3b8' },
  { key: 'background', label: 'Background', fallback: '#0b1020' },
  { key: 'surface', label: 'Surface', fallback: '#131a2e' },
  { key: 'surfaceAlt', label: 'Alternate surface', fallback: '#182038' },
  { key: 'primarySoft', label: 'Primary tint', fallback: '#1e2448' },
  { key: 'border', label: 'Border', fallback: '#1f2a44' },
] as const;
const RADII: ThemeTokens['borderRadius'][] = [
  'none',
  'sm',
  'md',
  'lg',
  'full',
];
const MODES: ThemeTokens['colorMode'][] = ['light', 'dark', 'system'];

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

export function ThemeForm({
  themeTokens,
  siteName,
  customFonts = [],
}: {
  themeTokens: ThemeTokens;
  siteName: string;
  customFonts?: CustomFont[];
}) {
  const router = useRouter();
  const [fontsList, setFontsList] = useState<CustomFont[]>(customFonts);
  const [fontSaving, setFontSaving] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [newFontFamily, setNewFontFamily] = useState('');
  const [newFontWeight, setNewFontWeight] = useState('400');
  const [newFontStyle, setNewFontStyle] = useState<'normal' | 'italic'>('normal');
  const [newFontMediaKey, setNewFontMediaKey] = useState('');

  const allBodyFonts = Array.from(new Set([...FONTS, ...fontsList.map(f => f.family)]));
  const allHeadingFonts = Array.from(new Set([...HEADING_FONTS, ...fontsList.map(f => f.family)]));

  const saveFonts = async (updated: CustomFont[]) => {
    setFontSaving(true);
    try {
      await updateCustomFonts({ customFonts: updated });
      toast.success('Custom fonts updated.');
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update custom fonts');
    } finally {
      setFontSaving(false);
    }
  };
  const form = useForm<ThemeFormInput>({
    resolver: zodResolver(themeFormSchema) as any,
    defaultValues: { themeTokens },
  });

  const { submit, isPending, error } = useFormAction(
    async (data: ThemeFormInput) => {
      const result = await updateThemeSettings(data);
      return result as Record<string, unknown>;
    },
    {
      onSuccess: () => {
        toast.success('Theme saved. The public site has been refreshed.');
        router.refresh();
      },
    }
  );

  const [installOpen, setInstallOpen] = useState(false);
  const [installing, setInstalling] = useState(false);
  const runInstall = async () => {
    setInstalling(true);
    try {
      const res = (await installQuietEditorial({})) as
        | { hasError?: boolean; message?: string }
        | undefined;
      if (res && 'hasError' in res && res.hasError) {
        toast.error(res.message || 'Could not install the starter kit.');
        return;
      }
      toast.success(
        'Quiet Editorial installed: theme, header, footer, archive, search and post layout are live. Create your home page from the “Quiet Editorial home” template.'
      );
      setInstallOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not install the starter kit.');
    } finally {
      setInstalling(false);
    }
  };

  const [customName, setCustomName] = useState('');
  const [customColor, setCustomColor] = useState('#8b5cf6');
  const [editingToken, setEditingToken] = useState<{
    id: string;
    name: string;
    value: string;
  } | null>(null);
  const [deletingToken, setDeletingToken] = useState<{
    id: string;
    name: string;
    value: string;
  } | null>(null);

  const addCustomToken = () => {
    if (!customName.trim()) {
      toast.error('Please enter a token name');
      return;
    }
    const currentTokens = form.getValues('themeTokens');
    const colors = currentTokens.colors ?? {};
    const custom = [...(colors.custom ?? [])];
    const id = customName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '-');
    if (custom.some(c => c.id === id)) {
      toast.error('A token with this name already exists');
      return;
    }
    custom.push({ id, name: customName.trim(), value: customColor });
    form.setValue(
      'themeTokens',
      {
        ...currentTokens,
        colors: {
          ...colors,
          custom,
        },
      },
      { shouldDirty: true }
    );
    setCustomName('');
    toast.success(`Token "${customName.trim()}" added`);
  };

  const saveEditedToken = () => {
    if (!editingToken) return;
    if (!editingToken.name.trim()) {
      toast.error('Please enter a token name');
      return;
    }
    if (!/^#[0-9a-fA-F]{6}$/.test(editingToken.value)) {
      toast.error('Use a valid 6-digit hex colour like #8b5cf6');
      return;
    }
    const currentTokens = form.getValues('themeTokens');
    const colors = currentTokens.colors ?? {};
    const custom = (colors.custom ?? []).map(c =>
      c.id === editingToken.id
        ? {
            ...c,
            name: editingToken.name.trim(),
            value: editingToken.value.toLowerCase(),
          }
        : c
    );
    form.setValue(
      'themeTokens',
      {
        ...currentTokens,
        colors: {
          ...colors,
          custom,
        },
      },
      { shouldDirty: true }
    );
    toast.success(
      `Token "${editingToken.name.trim()}" updated. Save theme to publish changes.`
    );
    setEditingToken(null);
  };

  const confirmRemoveCustomToken = () => {
    if (!deletingToken) return;
    const currentTokens = form.getValues('themeTokens');
    const colors = currentTokens.colors ?? {};
    const custom = (colors.custom ?? []).filter(c => c.id !== deletingToken.id);
    form.setValue(
      'themeTokens',
      {
        ...currentTokens,
        colors: {
          ...colors,
          custom,
        },
      },
      { shouldDirty: true }
    );
    toast.info(
      `Token "${deletingToken.name}" removed. References will fall back to default.`
    );
    setDeletingToken(null);
  };

  return (
    <FormProvider {...form}>
      <form
        onSubmit={form.handleSubmit(data => submit(data))}
        className="flex flex-col"
      >
        <Section
          title="Theme"
          description="Design tokens applied to every public page and builder block."
        >
          <Controller
            name="themeTokens.primaryColor"
            render={({ field, fieldState }) => (
              <Field group label="Primary colour">
                <ColorInput
                  label="Primary colour"
                  value={field.value}
                  onChange={v => field.onChange(v)}
                />
                {fieldState.error && (
                  <FormMessage>{fieldState.error.message}</FormMessage>
                )}
              </Field>
            )}
          />
          <Controller
            name="themeTokens.accentColor"
            render={({ field, fieldState }) => (
              <Field group label="Accent colour">
                <ColorInput
                  label="Accent colour"
                  value={field.value}
                  onChange={v => field.onChange(v)}
                />
                {fieldState.error && (
                  <FormMessage>{fieldState.error.message}</FormMessage>
                )}
              </Field>
            )}
          />
          <Controller
            name="themeTokens.colors.secondary"
            render={({ field }) => (
              <Field group label="Secondary colour">
                <ColorInput
                  label="Secondary colour"
                  value={field.value ?? '#64748b'}
                  onChange={v => field.onChange(v)}
                />
              </Field>
            )}
          />
          <Controller
            name="themeTokens.colors.text"
            render={({ field }) => (
              <Field group label="Text colour">
                <ColorInput
                  label="Text colour"
                  value={field.value ?? '#0f172a'}
                  onChange={v => field.onChange(v)}
                />
              </Field>
            )}
          />
          <Controller
            name="themeTokens.colors.background"
            render={({ field }) => (
              <Field group label="Background colour">
                <ColorInput
                  label="Background colour"
                  value={field.value ?? '#ffffff'}
                  onChange={v => field.onChange(v)}
                />
              </Field>
            )}
          />
          <Controller
            name="themeTokens.colors.surface"
            render={({ field }) => (
              <Field group label="Surface colour">
                <ColorInput
                  label="Surface colour"
                  value={field.value ?? '#f8fafc'}
                  onChange={v => field.onChange(v)}
                />
              </Field>
            )}
          />
          <Controller
            name="themeTokens.colors.border"
            render={({ field }) => (
              <Field group label="Border colour">
                <ColorInput
                  label="Border colour"
                  value={field.value ?? '#e2e8f0'}
                  onChange={v => field.onChange(v)}
                />
              </Field>
            )}
          />
          {EXTRA_COLORS.map(c => (
            <Controller
              key={c.key}
              name={`themeTokens.colors.${c.key}` as const}
              render={({ field }) => (
                <Field group label={c.label}>
                  <ColorInput
                    label={c.label}
                    value={field.value ?? c.fallback}
                    onChange={v => field.onChange(v)}
                  />
                </Field>
              )}
            />
          ))}
          <Controller
            name="themeTokens.fontFamily"
            render={({ field, fieldState }) => {
              const id = useId();
              return (
                <FormItem>
                  <Label htmlFor={id}>Font</Label>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id={id} className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {allBodyFonts.map(f => (
                        <SelectItem key={f} value={f}>
                          {f}
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
          <Controller
            name="themeTokens.borderRadius"
            render={({ field }) => (
              <Field group label="Corner radius">
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
              </Field>
            )}
          />
          <Controller
            name="themeTokens.headingFont"
            render={({ field }) => {
              const id = useId();
              return (
                <FormItem>
                  <Label htmlFor={id}>Heading font</Label>
                  <Select
                    value={field.value ?? SAME_AS_BODY}
                    onValueChange={v =>
                      field.onChange(v === SAME_AS_BODY ? undefined : v)
                    }
                  >
                    <SelectTrigger id={id} className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={SAME_AS_BODY}>Same as body</SelectItem>
                      {allHeadingFonts.map(f => (
                        <SelectItem key={f} value={f}>
                          {f}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              );
            }}
          />
          <Controller
            name="themeTokens.buttonRadius"
            render={({ field }) => (
              <Field
                group
                label="Button radius"
                hint="Buttons, badges and chips. Unset follows the corner radius."
              >
                <div
                  role="radiogroup"
                  aria-label="Button radius"
                  className="flex gap-1"
                >
                  {RADII.map(r => (
                    <button
                      key={r}
                      type="button"
                      role="radio"
                      aria-checked={field.value === r}
                      onClick={() =>
                        field.onChange(field.value === r ? undefined : r)
                      }
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
              </Field>
            )}
          />
          <Controller
            name="themeTokens.colorMode"
            render={({ field, fieldState }) => {
              const id = useId();
              return (
                <FormItem>
                  <Label htmlFor={id}>Colour mode</Label>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id={id} className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MODES.map(m => (
                        <SelectItem key={m} value={m}>
                          {m[0].toUpperCase() + m.slice(1)}
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

          <div className="sm:col-span-2 rounded-lg border border-steel-200 dark:border-dark-300 p-4 space-y-3">
            <div>
              <h4 className="text-sm font-semibold">Dark mode palette</h4>
              <p className="text-xs text-steel-500">
                Used when the colour mode is dark, when &ldquo;System&rdquo;
                resolves to dark, or when a visitor switches with the theme
                toggle. Leave a colour unset to use the built-in dark colour.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {DARK_COLORS.map(c => (
                <Controller
                  key={c.key}
                  name={`themeTokens.colorsDark.${c.key}` as const}
                  render={({ field }) => (
                    <Field group label={c.label}>
                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                          <ColorInput
                            label={`Dark ${c.label}`}
                            value={field.value ?? c.fallback}
                            onChange={v => field.onChange(v)}
                          />
                        </div>
                        {field.value && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={`Reset dark ${c.label}`}
                            onClick={() => field.onChange(undefined)}
                          >
                            <RotateCcw className="size-3.5" />
                          </Button>
                        )}
                      </div>
                    </Field>
                  )}
                />
              ))}
            </div>
          </div>

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
                  <button
                    type="button"
                    onClick={() => setEditingToken({ ...token })}
                    className="flex items-center gap-2 text-start hover:opacity-80 transition"
                    title={`Edit token "${token.name}"`}
                  >
                    <span
                      className="w-4 h-4 rounded-full border border-black/10 shrink-0"
                      style={{ backgroundColor: token.value }}
                    />
                    <span className="font-medium">{token.name}</span>
                    <span className="font-mono text-steel-400">
                      ({token.value})
                    </span>
                    <span className="font-mono text-[10px] text-steel-400">
                      --site-token-{token.id}
                    </span>
                  </button>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-steel-500 hover:text-steel-800 dark:hover:text-steel-200"
                      onClick={() => setEditingToken({ ...token })}
                      title="Edit token"
                      aria-label={`Edit token ${token.name}`}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-red-500 hover:text-red-700"
                      onClick={() => setDeletingToken({ ...token })}
                      title="Delete token"
                      aria-label={`Delete token ${token.name}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
              {(form.watch('themeTokens.colors.custom') ?? []).length === 0 && (
                <p className="text-xs text-steel-400 italic">
                  No custom tokens defined yet.
                </p>
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
                  onChange={value => setCustomColor(value ?? '#8b5cf6')}
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

          <div className="flex flex-wrap items-end gap-2 sm:col-span-2">
            {THEME_PRESETS.map(preset => (
              <Button
                key={preset.id}
                type="button"
                variant="outline"
                size="sm"
                title={preset.description}
                onClick={() => {
                  // Keep the site's own custom tokens when applying a preset.
                  const custom =
                    form.getValues('themeTokens.colors.custom') ?? [];
                  form.setValue(
                    'themeTokens',
                    {
                      ...preset.tokens,
                      colors: { ...preset.tokens.colors, custom },
                    } as ThemeFormInput['themeTokens'],
                    { shouldDirty: true }
                  );
                  toast.info(
                    `${preset.name} applied. Save to publish it to the site.`
                  );
                }}
              >
                <Sparkles /> Apply {preset.name}
              </Button>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setInstallOpen(true)}
            >
              <Sparkles /> Install Quiet Editorial site
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() =>
                form.setValue('themeTokens', DEFAULT_THEME_TOKENS, {
                  shouldDirty: true,
                })
              }
            >
              <RotateCcw /> Reset theme
            </Button>
          </div>
          <Controller
            name="themeTokens"
            render={({ field }) => (
              <ThemePreview
                tokens={field.value as ThemeTokens}
                siteName={siteName}
              />
            )}
          />
        </Section>

        <Section
          title="Custom fonts"
          description="Upload woff2 or woff font files to use across your theme and page builder typography."
        >
          <div className="sm:col-span-2 space-y-4 rounded-lg border border-steel-200 dark:border-dark-300 p-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold">Custom font families</h4>
              {fontsList.length > 0 && (
                <span className="text-xs text-steel-500">
                  {fontsList.length} font{fontsList.length > 1 ? 's' : ''} configured
                </span>
              )}
            </div>

            {fontsList.length === 0 ? (
              <p className="text-xs text-steel-400 italic">No custom fonts configured yet.</p>
            ) : (
              <div className="space-y-3">
                {fontsList.map((font, idx) => (
                  <div
                    key={font.family + idx}
                    className="rounded border border-steel-100 dark:border-dark-400 p-3 flex flex-col gap-2 bg-steel-50/50 dark:bg-dark-200/50"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm">{font.family}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-red-500 hover:text-red-700"
                        onClick={async () => {
                          const updated = fontsList.filter((_, i) => i !== idx);
                          setFontsList(updated);
                          await saveFonts(updated);
                        }}
                        title={`Remove ${font.family}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {font.weights.map((w, wIdx) => (
                        <div
                          key={wIdx}
                          className="text-xs rounded bg-white dark:bg-dark-300 border border-steel-200 dark:border-dark-400 px-2 py-1 font-mono text-steel-600 dark:text-steel-300 flex items-center gap-1.5"
                        >
                          <span>
                            {w.weight} {w.style || 'normal'}
                          </span>
                          <span
                            className="text-[10px] text-steel-400 truncate max-w-[150px]"
                            title={w.mediaKey}
                          >
                            ({w.mediaKey})
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="border-t border-steel-100 dark:border-dark-400 pt-3 space-y-3">
              <h5 className="text-xs font-semibold text-steel-700 dark:text-steel-300">
                Add a custom font
              </h5>
              <div className="grid gap-2 sm:grid-cols-4">
                <div className="sm:col-span-2">
                  <Label className="text-xs">Font family name</Label>
                  <Input
                    placeholder="e.g. Satoshi"
                    value={newFontFamily}
                    onChange={e => setNewFontFamily(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs">Weight</Label>
                  <Input
                    placeholder="400"
                    value={newFontWeight}
                    onChange={e => setNewFontWeight(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs">Style</Label>
                  <Select
                    value={newFontStyle}
                    onValueChange={(v: 'normal' | 'italic') => setNewFontStyle(v)}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="italic">Italic</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex flex-wrap items-end gap-2">
                <div className="flex-1 min-w-[200px]">
                  <Label className="text-xs">Font file (woff2 or woff)</Label>
                  <Input
                    placeholder="Media key or URL (e.g. fonts/satoshi.woff2)"
                    value={newFontMediaKey}
                    onChange={e => setNewFontMediaKey(e.target.value)}
                    className="h-8 text-xs font-mono"
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPickerOpen(true)}
                  className="h-8 text-xs"
                >
                  Pick from library
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={!newFontFamily.trim() || !newFontMediaKey.trim() || fontSaving}
                  onClick={async () => {
                    const fam = newFontFamily.trim();
                    const existingIdx = fontsList.findIndex(
                      f => f.family.toLowerCase() === fam.toLowerCase()
                    );
                    const newWeight: CustomFontWeight = {
                      weight: newFontWeight.trim() || '400',
                      style: newFontStyle,
                      mediaKey: newFontMediaKey.trim(),
                    };
                    let updated: CustomFont[];
                    if (existingIdx >= 0) {
                      updated = fontsList.map((f, i) =>
                        i === existingIdx
                          ? { ...f, weights: [...f.weights, newWeight] }
                          : f
                      );
                    } else {
                      updated = [...fontsList, { family: fam, weights: [newWeight] }];
                    }
                    setFontsList(updated);
                    setNewFontMediaKey('');
                    await saveFonts(updated);
                  }}
                  className="h-8 text-xs gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Font
                </Button>
              </div>
            </div>
          </div>
        </Section>

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
            onClick={() => form.reset({ themeTokens })}
          >
            Discard
          </Button>
          <Button
            type="submit"
            disabled={!form.formState.isDirty || isPending}
          >
            {isPending ? <Loader2 className="animate-spin" /> : <Save />} Save
            theme
          </Button>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      </form>

      <Dialog
        open={Boolean(editingToken)}
        onOpenChange={open => {
          if (!open) setEditingToken(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Custom Design Token</DialogTitle>
            <DialogDescription>
              Update the label or hex value for this custom design token.
            </DialogDescription>
          </DialogHeader>

          {editingToken && (
            <div className="space-y-4 py-1">
              <div className="flex items-start gap-2.5 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200">
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <div className="space-y-1">
                  <p className="font-semibold">Global token impact warning</p>
                  <p>
                    Changing this token updates every page, template, and
                    builder block referencing{' '}
                    <code className="rounded bg-amber-100 px-1 py-0.5 font-mono text-[11px] dark:bg-amber-900/60">
                      var(--site-token-{editingToken.id})
                    </code>{' '}
                    once you save the theme. Its token ID (
                    <code className="font-mono text-[11px]">
                      {editingToken.id}
                    </code>
                    ) stays locked so existing block bindings do not break.
                  </p>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-token-name" className="text-xs">
                  Token Name
                </Label>
                <Input
                  id="edit-token-name"
                  value={editingToken.name}
                  placeholder="e.g. Brand Highlight"
                  onChange={e =>
                    setEditingToken(prev =>
                      prev ? { ...prev, name: e.target.value } : null
                    )
                  }
                  className="h-9 text-xs"
                />
              </div>

              <div>
                <ColorInput
                  label="Color"
                  value={editingToken.value}
                  onChange={value =>
                    setEditingToken(prev =>
                      prev ? { ...prev, value: value ?? '#8b5cf6' } : null
                    )
                  }
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setEditingToken(null)}
            >
              Cancel
            </Button>
            <Button type="button" onClick={saveEditedToken}>
              Update Token
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(deletingToken)}
        onOpenChange={open => {
          if (!open) setDeletingToken(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Custom Design Token</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove this custom design token?
            </DialogDescription>
          </DialogHeader>

          {deletingToken && (
            <div className="space-y-3 py-1">
              <div className="flex items-center gap-2.5 rounded-md border border-steel-200 bg-steel-50/70 p-2.5 text-xs dark:border-dark-300 dark:bg-dark-200/50">
                <span
                  className="size-4 shrink-0 rounded-full border border-black/10"
                  style={{ backgroundColor: deletingToken.value }}
                />
                <span className="font-semibold">{deletingToken.name}</span>
                <span className="font-mono text-steel-500">
                  ({deletingToken.value})
                </span>
                <span className="ms-auto font-mono text-[11px] text-steel-400">
                  --site-token-{deletingToken.id}
                </span>
              </div>

              <div className="flex items-start gap-2.5 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200">
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <div className="space-y-1">
                  <p className="font-semibold">
                    Warning: Block references may be affected
                  </p>
                  <p>
                    Any pages, global blocks, or templates referencing{' '}
                    <code className="rounded bg-amber-100 px-1 py-0.5 font-mono text-[11px] dark:bg-amber-900/60">
                      var(--site-token-{deletingToken.id})
                    </code>{' '}
                    will lose this custom colour and automatically fall back to
                    their default theme colour once saved.
                  </p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setDeletingToken(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={confirmRemoveCustomToken}
            >
              Delete Token
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={installOpen} onOpenChange={setInstallOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Install the Quiet Editorial site?</DialogTitle>
            <DialogDescription>
              This applies the Quiet Editorial theme and adds published Quiet
              Editorial header, footer, archive and search templates, making
              them the site defaults. It also adds a default post layout and a
              “Quiet Editorial home” page template. Your existing templates and
              pages are kept, so you can switch back from Site templates.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setInstallOpen(false)}
              disabled={installing}
            >
              Cancel
            </Button>
            <Button type="button" onClick={runInstall} disabled={installing}>
              {installing ? <Loader2 className="animate-spin" /> : <Sparkles />}
              Install
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <MediaPickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        imagesOnly={false}
        onPick={item => {
          setNewFontMediaKey(item.url);
          if (!newFontFamily.trim()) {
            const inferred = item.filename
              .replace(/\.[^/.]+$/, '')
              .replace(/[-_]/g, ' ');
            setNewFontFamily(
              inferred.charAt(0).toUpperCase() + inferred.slice(1)
            );
          }
        }}
      />
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
      <span className="mb-1 block text-sm font-medium">
        Design System Preview
      </span>
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
          <h2
            className="mt-1 text-2xl font-bold"
            style={{ fontSize: 'var(--site-type-h2-size, 1.75rem)' }}
          >
            Ship pages your team is proud of.
          </h2>
          <p
            className={cn(
              'mt-1 text-sm',
              dark ? 'text-slate-400' : 'text-slate-500'
            )}
            style={{ fontSize: 'var(--site-type-body-size, 1rem)' }}
          >
            Design tokens provide site-wide consistency for colors, typography,
            and dynamic data bindings.
          </p>
        </div>

        {/* Global Color Swatches */}
        <div>
          <span className="text-xs font-medium text-steel-500 block mb-2">
            Token Palette
          </span>
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
              style={{
                backgroundColor: 'var(--site-color-secondary, #64748b)',
              }}
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
                style={{
                  backgroundColor: `var(--site-token-${c.id.toLowerCase().replace(/[^a-z0-9_-]/g, '-')}, ${c.value})`,
                }}
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
