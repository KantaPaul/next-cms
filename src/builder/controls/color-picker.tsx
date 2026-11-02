'use client';

import { Check, Copy, Paintbrush, Search, Sparkles, X } from 'lucide-react';
import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { HexColorPicker } from 'react-colorful';
import { Button } from '@/components/ui/button';
import { FormInput } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils/cn';
import { safeColor } from '../style';
import { type ThemeColorToken, themeColorTokens } from '../theme';
import { useEditorBridge } from './editor-bridge';
import { ControlLabel } from './primitives';

const QUICK_SWATCHES = [
  '#000000',
  '#ffffff',
  '#6366f1',
  '#ec4899',
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#ef4444',
];

const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const CSS_VAR = /^var\(\s*(--[\w-]+)\s*\)$/;

const CHECKERBOARD =
  'bg-[repeating-conic-gradient(#e2e8f0_0_25%,#fff_0_50%)] bg-[length:8px_8px]';

type Tab = 'variables' | 'custom';

export type ColorPickerProps = {
  label?: string;
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  placeholder?: string;
  defaultCssVar?: string;
  aside?: ReactNode;
  responsive?: boolean;
};

function sameHex(a: string, b: string) {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

function inferDefaultCssVar(label?: string): string | undefined {
  if (!label) return undefined;
  const lower = label.toLowerCase();
  if (lower.includes('text')) return '--site-color-text';
  if (lower.includes('border')) return '--site-color-border';
  if (lower.includes('background')) return '--site-color-background';
  return undefined;
}

export function ColorPicker({
  label,
  value,
  onChange,
  placeholder = 'Inherit',
  defaultCssVar,
  aside,
  responsive,
}: ColorPickerProps) {
  const { themeTokens } = useEditorBridge();
  const tokens = useMemo(() => themeColorTokens(themeTokens), [themeTokens]);

  const fallbackCssVar = defaultCssVar ?? inferDefaultCssVar(label);
  const inheritedToken = useMemo(
    () =>
      !value && fallbackCssVar
        ? tokens.find(t => t.cssVar === fallbackCssVar)
        : undefined,
    [value, fallbackCssVar, tokens]
  );

  const varName = value ? CSS_VAR.exec(value.trim())?.[1] : undefined;
  const token: ThemeColorToken | undefined = varName
    ? tokens.find(t => t.cssVar === varName)
    : undefined;
  /** A hard-coded value equal to a theme variable — offered as a swap. */
  const replaceable =
    !varName && value ? tokens.find(t => sameHex(t.value, value)) : undefined;
  /** What swatches paint: a variable resolves to its token's current value, or falls back to inherited theme token. */
  const resolved = varName
    ? token?.value
    : value || inheritedToken?.value;

  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>(varName || !value ? 'variables' : 'custom');
  const [query, setQuery] = useState('');
  const [draft, setDraft] = useState(value ?? '');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setDraft(value ?? '');
  }, [value]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tokens;
    return tokens.filter(
      t =>
        t.name.toLowerCase().includes(q) ||
        t.cssVar.includes(q) ||
        t.value.toLowerCase().includes(q)
    );
  }, [tokens, query]);

  const commitDraft = (raw: string) => {
    const trimmed = raw.trim();

    if (!trimmed) {
      onChange(undefined);
      return;
    }

    if (CSS_VAR.test(trimmed)) {
      onChange(trimmed);
      return;
    }

    const withHash = trimmed.startsWith('#') ? trimmed : `#${trimmed}`;

    if (HEX.test(withHash)) {
      onChange(withHash.toLowerCase());
    } else {
      setDraft(value ?? '');
    }
  };

  const pickHex = (hex: string) => {
    setDraft(hex);
    onChange(hex.toLowerCase());
  };

  const pickToken = (t: ThemeColorToken) => {
    onChange(`var(${t.cssVar})`);
    setOpen(false);
  };

  const copyVariable = async () => {
    if (!varName) return;
    try {
      await navigator.clipboard?.writeText(`var(${varName})`);
    } catch {
      // Clipboard can be blocked; the variable is still visible to copy by hand.
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const triggerText = token
    ? token.name
    : varName
      ? varName
      : value
        ? value.toUpperCase()
        : undefined;

  return (
    <div>
      {label && (
        <ControlLabel label={label} responsive={responsive}>
          {aside}
        </ControlLabel>
      )}

      <Popover open={open} onOpenChange={setOpen}>
        <div className="flex items-center gap-2">
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              title={varName ? `var(${varName})` : (value ?? placeholder)}
              aria-label={label ? `${label} color picker` : 'Color picker'}
              className={cn(
                'relative h-6 w-14 shrink-0 overflow-hidden rounded border border-border p-0 shadow-xs hover:border-muted-foreground',
                CHECKERBOARD
              )}
            >
              {resolved ? (
                <span
                  className="absolute inset-0"
                  style={{ backgroundColor: resolved }}
                />
              ) : (
                <Paintbrush className="size-3 text-muted-foreground" />
              )}
            </Button>
          </PopoverTrigger>

          <span
            className={cn(
              'flex min-w-0 items-center gap-1 truncate text-xs text-foreground',
              !varName && 'font-mono'
            )}
          >
            {varName && (
              <span className="shrink-0 rounded bg-primary/10 px-1 font-mono text-[10px] text-primary">
                var
              </span>
            )}
            {triggerText ?? (
              <span className="text-muted-foreground">
                {inheritedToken
                  ? `${placeholder} (${inheritedToken.name} · ${inheritedToken.value.toUpperCase()})`
                  : placeholder}
              </span>
            )}
          </span>

          {value && (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Clear color"
              onClick={() => onChange(undefined)}
              className="ml-auto size-6 text-muted-foreground"
            >
              <X className="size-3.5" />
            </Button>
          )}
        </div>

        <PopoverContent
          align="start"
          side="left"
          sideOffset={8}
          className="w-64 space-y-3 p-3"
        >
          <div
            role="tablist"
            aria-label="Color source"
            className="flex items-center rounded-md border border-border bg-muted/40 p-0.5"
          >
            {(['variables', 'custom'] as const).map(t => (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={tab === t}
                onClick={() => setTab(t)}
                className={cn(
                  'flex-1 rounded py-1 text-xs font-medium capitalize transition-colors',
                  tab === t
                    ? 'bg-background font-semibold text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span
              className={cn(
                'relative size-7 shrink-0 overflow-hidden rounded-md border border-black/15',
                CHECKERBOARD
              )}
            >
              {resolved && (
                <span
                  className="absolute inset-0"
                  style={{ backgroundColor: resolved }}
                />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-semibold text-foreground">
                {token?.name ??
                  (value
                    ? value.toUpperCase()
                    : inheritedToken
                      ? `${inheritedToken.name} (${inheritedToken.value.toUpperCase()})`
                      : 'No color')}
              </div>
              {varName ? (
                <div className="flex items-center gap-1">
                  <code className="truncate font-mono text-[10px] text-primary">
                    var({varName})
                  </code>
                  <button
                    type="button"
                    aria-label={`Copy var(${varName})`}
                    title="Copy CSS variable"
                    onClick={copyVariable}
                    className="rounded p-0.5 text-muted-foreground hover:text-primary"
                  >
                    {copied ? (
                      <Check className="size-3 text-emerald-600" />
                    ) : (
                      <Copy className="size-3" />
                    )}
                  </button>
                </div>
              ) : (
                <div className="text-[10px] text-muted-foreground">
                  {value
                    ? 'Hard-coded value'
                    : inheritedToken
                      ? `Inherited from Theme · var(${inheritedToken.cssVar})`
                      : placeholder}
                </div>
              )}
            </div>
          </div>

          {varName && !token && (
            <p className="rounded-md border border-amber-500/40 bg-amber-500/10 p-2 text-[11px] text-foreground">
              This variable no longer exists in the theme. Pick another color.
            </p>
          )}

          {replaceable && (
            <div
              role="status"
              className="flex items-start gap-1.5 rounded-md border border-amber-500/40 bg-amber-500/10 p-2 text-[11px] text-foreground"
            >
              <Sparkles className="mt-0.5 size-3 shrink-0 text-amber-600" />
              <div className="min-w-0 flex-1">
                <div>
                  Matches theme color <strong>{replaceable.name}</strong>.
                </div>
                <button
                  type="button"
                  onClick={() => pickToken(replaceable)}
                  className="mt-1 font-semibold text-primary hover:underline"
                >
                  Use var({replaceable.cssVar})
                </button>
              </div>
            </div>
          )}

          {tab === 'variables' && (
            <div role="tabpanel" className="space-y-2">
              <div className="relative">
                <Search
                  aria-hidden
                  className="pointer-events-none absolute start-2 top-1/2 size-3 -translate-y-1/2 text-muted-foreground"
                />
                <FormInput
                  type="search"
                  aria-label="Search theme colors"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search color or variable…"
                  className="h-7 bg-muted/40 ps-6 pe-2 text-xs"
                />
              </div>

              {filtered.length === 0 ? (
                <p className="py-2 text-center text-xs text-muted-foreground">
                  No theme colors match “{query}”
                </p>
              ) : (
                <ul className="max-h-56 space-y-0.5 overflow-y-auto">
                  {filtered.map(t => {
                    const selected = t.cssVar === varName;
                    return (
                      <li key={t.cssVar}>
                        <button
                          type="button"
                          aria-pressed={selected}
                          title={`var(${t.cssVar})\n${t.value}`}
                          onClick={() => pickToken(t)}
                          className={cn(
                            'flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-left hover:bg-muted',
                            selected && 'bg-primary/10'
                          )}
                        >
                          <span
                            className="size-5 shrink-0 rounded border border-black/10"
                            style={{ backgroundColor: t.value }}
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-xs font-medium text-foreground">
                              {t.name}
                            </span>
                            <span className="block truncate font-mono text-[10px] text-muted-foreground">
                              {t.cssVar}
                            </span>
                          </span>
                          {selected ? (
                            <Check className="size-3.5 shrink-0 text-primary" />
                          ) : (
                            <span className="shrink-0 font-mono text-[10px] text-muted-foreground uppercase">
                              {t.value}
                            </span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}

              <p className="text-[10px] leading-snug text-muted-foreground">
                Variables follow Settings → Theme, so changing the theme
                recolors this element.
              </p>
            </div>
          )}

          {tab === 'custom' && (
            <div role="tabpanel" className="space-y-3">
              <div className="overflow-hidden rounded-md [&_.react-colorful]:h-36 [&_.react-colorful]:w-full">
                <HexColorPicker
                  color={safeColor(resolved) ?? '#6366f1'}
                  onChange={pickHex}
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold text-muted-foreground">
                  HEX
                </span>
                <FormInput
                  type="text"
                  value={draft}
                  placeholder="#000000 or var(--…)"
                  onChange={e => setDraft(e.target.value)}
                  onBlur={e => commitDraft(e.target.value)}
                  onKeyDown={e =>
                    e.key === 'Enter' && commitDraft(e.currentTarget.value)
                  }
                  className="h-7 flex-1 bg-muted/40 px-2 font-mono text-xs"
                />
              </div>

              <div className="flex flex-wrap gap-1.5">
                {QUICK_SWATCHES.map(swatch => (
                  <Button
                    key={swatch}
                    type="button"
                    variant="outline"
                    title={swatch}
                    aria-label={swatch}
                    onClick={() => pickHex(swatch)}
                    style={{ backgroundColor: swatch }}
                    className={cn(
                      'size-5 rounded-full border-black/10 p-0 hover:scale-110',
                      value && sameHex(value, swatch) &&
                        'ring-2 ring-primary ring-offset-1'
                    )}
                  />
                ))}
              </div>
            </div>
          )}

          {value && (
            <div className="flex justify-end border-t border-border pt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  onChange(undefined);
                  setOpen(false);
                }}
                className="h-7 px-2 text-[11px] text-muted-foreground"
              >
                Clear
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}
