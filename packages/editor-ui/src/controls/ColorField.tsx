import { Check, Copy, Search, Sparkles } from 'lucide-react';
import React from 'react';
import { useId, useMemo, useState } from 'react';
import { cn } from '../lib/cn';
import { Popover } from '../primitives/Popover';
import { type ControlDeviceState, ControlRow } from './ControlRow';
import {
  type ContrastRating,
  getContrastRating,
  getContrastRatio,
  parseColor,
  toHex,
} from './color';

export interface ColorToken {
  name: string;
  value: string;
  cssVar?: string;
}

export const DEFAULT_COLOR_TOKENS: ColorToken[] = [
  { name: 'Primary', value: '#2563EB', cssVar: '--ne-primary' },
  { name: 'Primary Soft', value: '#DBEAFE', cssVar: '--ne-primary-soft' },
  { name: 'Dark Ink', value: '#0F172A', cssVar: '--ne-text' },
  { name: 'Muted Ink', value: '#64748B', cssVar: '--ne-text-muted' },
  { name: 'Canvas White', value: '#FFFFFF', cssVar: '--ne-surface' },
  { name: 'Canvas Dark', value: '#1E293B', cssVar: '--ne-bg' },
  { name: 'Emerald Success', value: '#059669', cssVar: '--ne-success' },
  { name: 'Amber Warning', value: '#D97706', cssVar: '--ne-warning' },
  { name: 'Crimson Danger', value: '#DC2626', cssVar: '--ne-danger' },
  { name: 'Violet Accent', value: '#8B5CF6' },
  { name: 'Cyan Accent', value: '#06B6D4' },
  { name: 'Transparent', value: 'transparent' },
];

export interface ColorFieldProps {
  id?: string;
  label?: string;
  value: string;
  onChange: (value: string, tokenName?: string) => void;
  tokens?: readonly ColorToken[] | ColorToken[];
  contrastAgainst?: string;
  showContrast?: boolean;
  /** Shows "Set Transparent" in the popover footer (default true). */
  allowTransparent?: boolean;
  info?: string;
  changed?: boolean;
  onReset?: () => void;
  tokenName?: string;
  onClearToken?: () => void;
  deviceState?: ControlDeviceState;
  helperText?: string;
  errorText?: string;
  disabled?: boolean;
  className?: string;
}

/** True for `var(--name)` or `var(--name, fallback)`. */
export function isCssVariable(value: string): boolean {
  return /^var\(\s*--[\w-]+\s*(,.*)?\)$/.test(value.trim());
}

function sameColor(a: string, b: string): boolean {
  if (a.trim().toLowerCase() === b.trim().toLowerCase()) return true;
  const pa = parseColor(a);
  const pb = parseColor(b);
  return !!pa && !!pb && toHex(pa) === toHex(pb) && pa.a === pb.a;
}

/** The theme variable whose value equals a hard-coded color, if any. */
export function findVariableTokenForValue(
  tokens: readonly ColorToken[],
  value: string
): (ColorToken & { cssVar: string }) | undefined {
  if (!value || isCssVariable(value) || value === 'transparent') return undefined;
  return tokens.find(
    (t): t is ColorToken & { cssVar: string } =>
      !!t.cssVar && sameColor(t.value, value)
  );
}

/** Tokens whose name, variable, or value contains the query. */
export function filterColorTokens(
  tokens: readonly ColorToken[],
  query: string
): ColorToken[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...tokens];
  return tokens.filter(
    t =>
      t.name.toLowerCase().includes(q) ||
      t.value.toLowerCase().includes(q) ||
      !!t.cssVar?.toLowerCase().includes(q)
  );
}

const CHECKERBOARD =
  'linear-gradient(45deg, #cbd5e1 25%, transparent 25%), linear-gradient(-45deg, #cbd5e1 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #cbd5e1 75%), linear-gradient(-45deg, transparent 75%, #cbd5e1 75%)';

/** Paints a swatch; transparent shows a checkerboard. */
function swatchStyle(color: string): React.CSSProperties {
  if (color === 'transparent' || !color) {
    return {
      backgroundColor: '#fff',
      backgroundImage: CHECKERBOARD,
      backgroundSize: '6px 6px',
      backgroundPosition: '0 0, 0 3px, 3px -3px, -3px 0',
    };
  }
  return { backgroundColor: color };
}

function isLightColor(color: string): boolean {
  if (color === 'transparent') return true;
  const parsed = parseColor(color);
  if (!parsed) return false;
  return getContrastRatio(color, '#000000') > getContrastRatio(color, '#FFFFFF');
}

export const ContrastBadge: React.FC<{
  foreground: string;
  background?: string;
  className?: string;
}> = ({ foreground, background = '#FFFFFF', className }) => {
  const ratio = useMemo(
    () => getContrastRatio(foreground, background),
    [foreground, background]
  );
  const rating: ContrastRating = useMemo(
    () => getContrastRating(ratio),
    [ratio]
  );

  const badgeColor =
    rating === 'AAA' || rating === 'AA'
      ? 'bg-[var(--ne-success)]/15 text-[var(--ne-success)] border-[var(--ne-success)]/30'
      : rating === 'AA Large'
        ? 'bg-[var(--ne-warning)]/15 text-[var(--ne-warning)] border-[var(--ne-warning)]/30'
        : 'bg-[var(--ne-danger)]/15 text-[var(--ne-danger)] border-[var(--ne-danger)]/30';

  return (
    <span
      title={`Contrast ratio against ${background}: ${ratio}:1 (${rating})`}
      className={cn(
        'inline-flex items-center gap-1 rounded-[var(--ne-radius-sm)] border px-1.5 py-0.5 font-mono text-[10px] font-semibold leading-none select-none',
        badgeColor,
        className
      )}
    >
      <span>{ratio}:1</span>
      <span className="opacity-80">· {rating}</span>
    </span>
  );
};

export const ColorField: React.FC<ColorFieldProps> = ({
  id,
  label,
  value,
  onChange,
  tokens = DEFAULT_COLOR_TOKENS,
  contrastAgainst = '#FFFFFF',
  showContrast = true,
  allowTransparent = true,
  info,
  changed,
  onReset,
  tokenName,
  onClearToken,
  deviceState,
  helperText,
  errorText,
  disabled = false,
  className,
}) => {
  const generatedId = useId();
  const fieldId =
    id ?? (label ? `field-${label.toLowerCase().replace(/\s+/g, '-')}` : generatedId);
  const [activeTab, setActiveTab] = useState<'variables' | 'custom'>(
    'variables'
  );
  const [tokenQuery, setTokenQuery] = useState('');
  const [copied, setCopied] = useState(false);

  const parsed = useMemo(() => parseColor(value), [value]);
  const hexValue = useMemo(
    () => (parsed ? toHex(parsed) : value.startsWith('#') ? value : '#000000'),
    [parsed, value]
  );

  const matchedToken = useMemo(() => {
    return tokens.find(
      t =>
        t.value.toLowerCase() === value.toLowerCase() ||
        (tokenName && t.name.toLowerCase() === tokenName.toLowerCase()) ||
        (t.cssVar && value.includes(t.cssVar))
    );
  }, [tokens, value, tokenName]);

  const isVariable = isCssVariable(value);
  /** A hard-coded value that equals a theme variable's value. */
  const replaceableToken = useMemo(
    () => (isVariable ? undefined : findVariableTokenForValue(tokens, value)),
    [tokens, value, isVariable]
  );
  const filteredTokens = useMemo(
    () => filterColorTokens(tokens, tokenQuery),
    [tokens, tokenQuery]
  );
  const variableText = isVariable
    ? value.trim()
    : matchedToken?.cssVar
      ? `var(${matchedToken.cssVar})`
      : null;
  /** What the swatch paints: a variable resolves to its token's value. */
  const swatchColor =
    isVariable && matchedToken ? matchedToken.value : value || 'transparent';

  const copyVariable = async () => {
    if (!variableText) return;
    try {
      await navigator.clipboard?.writeText(variableText);
    } catch {
      // Clipboard can be blocked; the text is still visible to copy by hand.
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const tabButton = (tab: 'variables' | 'custom', text: string) => (
    <button
      type="button"
      role="tab"
      aria-selected={activeTab === tab}
      onClick={() => setActiveTab(tab)}
      className={cn(
        'flex-1 rounded-[var(--ne-radius-xs)] py-1 text-xs font-medium transition-colors select-none',
        activeTab === tab
          ? 'bg-[var(--ne-surface)] text-[var(--ne-text)] shadow-xs font-semibold'
          : 'text-[var(--ne-text-muted)] hover:text-[var(--ne-text)]'
      )}
    >
      {text}
    </button>
  );

  const popoverContent = (close: () => void) => (
    <div className="w-64 space-y-3 p-1">
      {/* Tabs Header */}
      <div
        role="tablist"
        aria-label="Color source"
        className="flex items-center rounded-[var(--ne-radius-sm)] border border-[var(--ne-border)] bg-[var(--ne-surface-subtle)] p-0.5"
      >
        {tabButton('variables', 'Variables')}
        {tabButton('custom', 'Custom')}
      </div>

      {/* Current value: swatch, name, and the var(--…) to copy */}
      <div className="flex items-center gap-2">
        <span
          className="h-7 w-7 shrink-0 rounded-[var(--ne-radius-md)] border border-black/15"
          style={swatchStyle(swatchColor)}
        />
        <div className="min-w-0 flex-1">
          <div className="truncate text-xs font-semibold text-[var(--ne-text)]">
            {matchedToken?.name ?? (value || 'No color')}
          </div>
          {variableText ? (
            <div className="flex items-center gap-1">
              <code className="truncate font-mono text-[10px] text-[var(--ne-primary)]">
                {variableText}
              </code>
              <button
                type="button"
                aria-label={`Copy ${variableText}`}
                title="Copy CSS variable"
                onClick={copyVariable}
                className="rounded p-0.5 text-[var(--ne-text-muted)] hover:text-[var(--ne-primary)]"
              >
                {copied ? (
                  <Check className="h-3 w-3 text-[var(--ne-success)]" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </button>
            </div>
          ) : (
            <div className="font-mono text-[10px] text-[var(--ne-text-muted)]">
              {value ? 'Hard-coded value' : 'Inherited'}
            </div>
          )}
        </div>
      </div>

      {/* A hard-coded value that already exists as a theme token */}
      {replaceableToken && (
        <div
          role="status"
          className="flex items-start gap-1.5 rounded-[var(--ne-radius-md)] border border-[var(--ne-warning)]/40 bg-[var(--ne-warning-soft)] p-2 text-[11px] text-[var(--ne-text)]"
        >
          <Sparkles className="mt-0.5 h-3 w-3 shrink-0 text-[var(--ne-warning)]" />
          <div className="min-w-0 flex-1">
            <div>
              Matches theme token <strong>{replaceableToken.name}</strong>:
              replace hard-coded value
            </div>
            <button
              type="button"
              onClick={() =>
                onChange(`var(${replaceableToken.cssVar})`, replaceableToken.name)
              }
              className="mt-1 font-semibold text-[var(--ne-primary)] hover:underline"
            >
              Use var({replaceableToken.cssVar})
            </button>
          </div>
        </div>
      )}

      {/* Variables Tab */}
      {activeTab === 'variables' && (
        <div className="space-y-2" role="tabpanel">
          <div className="relative">
            <Search
              aria-hidden
              className="pointer-events-none absolute start-2 top-1/2 h-3 w-3 -translate-y-1/2 text-[var(--ne-text-muted)]"
            />
            <input
              type="search"
              aria-label="Search color tokens"
              value={tokenQuery}
              onChange={e => setTokenQuery(e.target.value)}
              placeholder="Search token or variable…"
              className="h-7 w-full rounded-[var(--ne-radius-md)] border border-[var(--ne-border)] bg-[var(--ne-surface-subtle)] ps-6 pe-2 text-xs text-[var(--ne-text)] outline-none focus:border-[var(--ne-primary)] focus:bg-[var(--ne-surface)]"
            />
          </div>
          {filteredTokens.length === 0 ? (
            <p className="py-2 text-center text-xs text-[var(--ne-text-muted)]">
              No tokens match “{tokenQuery}”
            </p>
          ) : (
            <div className="grid grid-cols-6 gap-1.5">
              {filteredTokens.map(token => {
                const isSelected =
                  value.toLowerCase() === token.value.toLowerCase() ||
                  (token.cssVar && value.includes(token.cssVar)) ||
                  tokenName === token.name;

                return (
                  <button
                    key={token.name}
                    type="button"
                    title={`${token.name}${token.cssVar ? `\nvar(${token.cssVar})` : ''}\n${token.value}`}
                    aria-label={token.name}
                    aria-pressed={!!isSelected}
                    onClick={() => {
                      onChange(token.cssVar ? `var(${token.cssVar})` : token.value, token.name);
                      close();
                    }}
                    className={cn(
                      'relative h-7 rounded-[var(--ne-radius-sm)] border flex items-center justify-center transition-all hover:scale-105',
                      isSelected
                        ? 'ring-2 ring-[var(--ne-primary)] border-transparent'
                        : 'border-[var(--ne-border)]'
                    )}
                    style={swatchStyle(token.value)}
                  >
                    {isSelected && (
                      <Check
                        className={cn(
                          'h-3.5 w-3.5',
                          isLightColor(token.value) ? 'text-slate-900' : 'text-white'
                        )}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Custom Tab */}
      {activeTab === 'custom' && (
        <div className="space-y-3" role="tabpanel">
          <div className="flex items-center gap-2">
            <label
              className="relative h-9 w-9 shrink-0 cursor-pointer overflow-hidden rounded-[var(--ne-radius-md)] border border-[var(--ne-border)] shadow-xs"
              style={swatchStyle(swatchColor)}
            >
              <input
                type="color"
                aria-label="Pick a custom color"
                value={hexValue}
                onChange={e => onChange(e.target.value)}
                className="absolute inset-0 h-full w-full opacity-0 cursor-pointer"
              />
            </label>
            <div className="flex-1 min-w-0">
              <input
                type="text"
                aria-label="Color value"
                value={value}
                onChange={e => onChange(e.target.value)}
                placeholder="#000000 or var(--…)"
                className="w-full rounded-[var(--ne-radius-md)] border border-[var(--ne-border)] bg-[var(--ne-surface)] px-2.5 py-1.5 font-mono text-xs text-[var(--ne-text)] focus:border-[var(--ne-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--ne-primary)]"
              />
            </div>
          </div>

          {/* Quick Swatches */}
          <div className="flex items-center gap-1.5 pt-1">
            {['#000000', '#FFFFFF', '#2563EB', '#10B981', '#F59E0B', '#EF4444'].map(hex => (
              <button
                key={hex}
                type="button"
                aria-label={hex}
                onClick={() => onChange(hex)}
                className="h-5 w-5 rounded-full border border-[var(--ne-border)] transition-transform hover:scale-110"
                style={{ backgroundColor: hex }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Footer: Set Transparent and the contrast ratio */}
      {(allowTransparent || showContrast) && (
        <div className="flex items-center justify-between gap-2 border-t border-[var(--ne-border)] pt-2 text-[11px]">
          {allowTransparent ? (
            <button
              type="button"
              onClick={() => {
                onChange('transparent');
                close();
              }}
              className="text-[var(--ne-text-muted)] hover:text-[var(--ne-text)] hover:underline"
            >
              Set Transparent
            </button>
          ) : (
            <span />
          )}
          {showContrast && (
            <ContrastBadge foreground={swatchColor} background={contrastAgainst} />
          )}
        </div>
      )}
    </div>
  );

  const trigger = (
    <button
      type="button"
      id={fieldId}
      disabled={disabled}
      className={cn(
        'inline-flex items-center justify-between gap-2 rounded-[var(--ne-radius-md)] border border-[var(--ne-border)] bg-[var(--ne-surface)] px-2 h-7 text-xs text-[var(--ne-text)] transition-colors hover:border-[var(--ne-border-strong)] focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--ne-focus-ring)] disabled:cursor-not-allowed disabled:opacity-50 w-full',
        className
      )}
    >
      <div className="flex items-center gap-2 min-w-0">
        <span
          className="h-4 w-4 shrink-0 rounded-[var(--ne-radius-xs)] border border-black/15 shadow-2xs"
          style={swatchStyle(swatchColor)}
        />
        <span className="truncate font-mono text-[11px]">
          {matchedToken ? matchedToken.name : value}
        </span>
      </div>
      {showContrast && (
        <ContrastBadge foreground={swatchColor} background={contrastAgainst} className="shrink-0" />
      )}
    </button>
  );

  const content = (
    <Popover
      trigger={trigger}
      content={popoverContent}
      align="end"
    />
  );

  if (!label) {
    return <div className={className}>{content}</div>;
  }

  return (
    <ControlRow
      label={label}
      htmlFor={fieldId}
      info={info}
      changed={changed}
      onReset={onReset}
      tokenName={tokenName ?? matchedToken?.name}
      onClearToken={onClearToken}
      deviceState={deviceState}
      helperText={helperText}
      errorText={errorText}
      className={className}
    >
      {content}
    </ControlRow>
  );
};
