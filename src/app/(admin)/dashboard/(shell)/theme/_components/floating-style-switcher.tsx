'use client';

import { Monitor, Moon, Palette, RotateCcw, Sparkles, Sun, X } from 'lucide-react';
import { useState } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { toast } from 'sonner';
import { THEME_PRESETS } from '@/builder/theme-presets';
import { Button } from '@/components/ui/button';
import {
  DEFAULT_THEME_TOKENS,
  type ThemeTokens,
} from '@/db/schemas/pages.schema';
import { cn } from '@/lib/utils/cn';
import type { ThemeFormInput } from '../../settings/_modules/settings.schemas';

const MODES: Array<{
  value: ThemeTokens['colorMode'];
  label: string;
  icon: typeof Sun;
}> = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
];

export function FloatingStyleSwitcher({
  form,
}: {
  form: UseFormReturn<ThemeFormInput>;
}) {
  const [open, setOpen] = useState(false);
  const tokens = form.watch('themeTokens') as ThemeTokens | undefined;
  const mode = tokens?.colorMode ?? 'light';

  const applyTokens = (next: ThemeTokens, label: string) => {
    form.setValue('themeTokens', next, { shouldDirty: true });
    toast.info(`${label} applied. Save to publish it to the site.`);
  };

  const applyPreset = (preset: (typeof THEME_PRESETS)[number]) => {
    const custom = (form.getValues('themeTokens.colors.custom') ?? []) as NonNullable<
      ThemeTokens['colors']
    >['custom'];
    applyTokens(
      {
        ...preset.tokens,
        colors: { ...preset.tokens.colors, custom },
      } as ThemeTokens,
      preset.name
    );
  };

  const setMode = (next: ThemeTokens['colorMode']) => {
    const current = form.getValues('themeTokens') as ThemeTokens;
    form.setValue(
      'themeTokens',
      { ...current, colorMode: next },
      { shouldDirty: true }
    );
  };

  return (
    <div className="fixed bottom-24 right-4 z-50 flex flex-col items-end gap-2 sm:right-6">
      {open && (
        <div
          className="w-72 overflow-hidden rounded-xl border border-steel-200 bg-white/95 shadow-lg backdrop-blur dark:border-dark-300 dark:bg-dark-100/95"
          role="dialog"
          aria-label="Style switcher"
        >
          <div className="flex items-center justify-between border-b border-steel-100 px-3 py-2 dark:border-dark-300">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Palette className="size-4 text-indigo-600 dark:text-indigo-400" />
              Style switcher
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7"
              aria-label="Close style switcher"
              onClick={() => setOpen(false)}
            >
              <X className="size-4" />
            </Button>
          </div>

          <div className="space-y-3 p-3">
            <div>
              <p className="mb-1.5 text-xs font-medium text-steel-500">Presets</p>
              <div className="flex flex-col gap-1.5">
                {THEME_PRESETS.map(preset => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => applyPreset(preset)}
                    className="flex items-center gap-2 rounded-md border border-steel-200 px-2.5 py-2 text-left text-xs transition hover:border-indigo-400 hover:bg-indigo-50/50 dark:border-dark-300 dark:hover:border-indigo-500 dark:hover:bg-indigo-950/30"
                    title={preset.description}
                  >
                    <Sparkles className="size-3.5 shrink-0 text-indigo-500" />
                    <span className="font-medium">{preset.name}</span>
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => applyTokens(DEFAULT_THEME_TOKENS, 'Default theme')}
                  className="flex items-center gap-2 rounded-md border border-steel-200 px-2.5 py-2 text-left text-xs transition hover:border-steel-400 hover:bg-steel-50 dark:border-dark-300 dark:hover:bg-dark-200/60"
                >
                  <RotateCcw className="size-3.5 shrink-0 text-steel-500" />
                  <span className="font-medium">Reset to defaults</span>
                </button>
              </div>
            </div>

            <div>
              <p className="mb-1.5 text-xs font-medium text-steel-500">Colour mode</p>
              <div className="grid grid-cols-3 gap-1">
                {MODES.map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setMode(value)}
                    className={cn(
                      'flex flex-col items-center gap-1 rounded-md border px-2 py-1.5 text-[11px] font-medium transition',
                      mode === value
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-200'
                        : 'border-steel-200 text-steel-600 hover:border-steel-400 dark:border-dark-300 dark:text-steel-300'
                    )}
                    aria-pressed={mode === value}
                  >
                    <Icon className="size-3.5" />
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <Button
        type="button"
        size="icon"
        className={cn(
          'size-11 rounded-full shadow-lg',
          open ? 'bg-indigo-600 text-white hover:bg-indigo-700' : ''
        )}
        variant={open ? 'default' : 'outline'}
        aria-label={open ? 'Close style switcher' : 'Open style switcher'}
        aria-expanded={open}
        onClick={() => setOpen(o => !o)}
      >
        {open ? <X className="size-5" /> : <Palette className="size-5" />}
      </Button>
    </div>
  );
}
