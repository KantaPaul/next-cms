'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  AlertTriangle,
  Loader2,
  Pencil,
  Plus,
  RotateCcw,
  Save,
  Trash2,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useId, useState } from 'react';
import { Controller, FormProvider, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { ColorInput } from '@/builder/controls/primitives';
import { themeStyle } from '@/builder/theme';
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
import { updateThemeSettings } from '../../settings/_modules/settings.actions';
import {
  type ThemeFormInput,
  themeFormSchema,
} from '../../settings/_modules/settings.schemas';

const FONTS: ThemeTokens['fontFamily'][] = [
  'Manrope',
  'Inter',
  'Plus Jakarta Sans',
  'JetBrains Mono',
  'System',
];
const HEADING_FONTS = [
  'Newsreader',
  'Fraunces',
  'Instrument Serif',
  'Playfair Display',
  'Manrope',
  'Inter',
  'Plus Jakarta Sans',
  'System',
];
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
}: {
  themeTokens: ThemeTokens;
  siteName: string;
}) {
  const router = useRouter();
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
            name="themeTokens.colors.textMuted"
            render={({ field }) => (
              <Field group label="Muted text colour">
                <ColorInput
                  label="Muted text colour"
                  value={field.value ?? '#4a453e'}
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
                      {FONTS.map(f => (
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
            name="themeTokens.headingFont"
            render={({ field }) => {
              const id = useId();
              return (
                <FormItem>
                  <Label htmlFor={id}>Heading Display Font</Label>
                  <Select value={field.value ?? 'Newsreader'} onValueChange={field.onChange}>
                    <SelectTrigger id={id} className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {HEADING_FONTS.map(f => (
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
          <Controller
            name="themeTokens.headingFont"
            render={({ field }) => {
              const id = useId();
              return (
                <FormItem>
                  <Label htmlFor={id}>Heading Display Font</Label>
                  <Select value={field.value ?? 'Newsreader'} onValueChange={field.onChange}>
                    <SelectTrigger id={id} className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {HEADING_FONTS.map(f => (
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
                    className="flex items-center gap-2 text-left hover:opacity-80 transition"
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

          <div className="flex items-end">
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
                <span className="ml-auto font-mono text-[11px] text-steel-400">
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
