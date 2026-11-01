import { Check } from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState<'tokens' | 'custom'>('tokens');

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

  const popoverContent = (close: () => void) => (
    <div className="w-64 space-y-3 p-1">
      {/* Tabs Header */}
      <div className="flex items-center rounded-[var(--ne-radius-sm)] border border-[var(--ne-border)] bg-[var(--ne-surface-subtle)] p-0.5">
        <button
          type="button"
          onClick={() => setActiveTab('tokens')}
          className={cn(
            'flex-1 rounded-[var(--ne-radius-xs)] py-1 text-xs font-medium transition-colors select-none',
            activeTab === 'tokens'
              ? 'bg-[var(--ne-surface)] text-[var(--ne-text)] shadow-xs font-semibold'
              : 'text-[var(--ne-text-muted)] hover:text-[var(--ne-text)]'
          )}
        >
          Tokens
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('custom')}
          className={cn(
            'flex-1 rounded-[var(--ne-radius-xs)] py-1 text-xs font-medium transition-colors select-none',
            activeTab === 'custom'
              ? 'bg-[var(--ne-surface)] text-[var(--ne-text)] shadow-xs font-semibold'
              : 'text-[var(--ne-text-muted)] hover:text-[var(--ne-text)]'
          )}
        >
          Custom
        </button>
      </div>

      {/* Tokens Tab */}
      {activeTab === 'tokens' && (
        <div className="space-y-2">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--ne-text-muted)]">
            Site Palette Tokens
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {tokens.map(token => {
              const isSelected =
                value.toLowerCase() === token.value.toLowerCase() ||
                (token.cssVar && value.includes(token.cssVar)) ||
                tokenName === token.name;

              return (
                <button
                  key={token.name}
                  type="button"
                  title={`${token.name} (${token.value})`}
                  onClick={() => {
                    onChange(token.cssVar ? `var(${token.cssVar})` : token.value, token.name);
                    close();
                  }}
                  className={cn(
                    'relative h-8 rounded-[var(--ne-radius-sm)] border flex items-center justify-center transition-all hover:scale-105',
                    isSelected
                      ? 'ring-2 ring-[var(--ne-primary)] border-transparent'
                      : 'border-[var(--ne-border)]'
                  )}
                  style={{ backgroundColor: token.value }}
                >
                  {isSelected && (
                    <Check
                      className={cn(
                        'h-3.5 w-3.5',
                        token.value === '#FFFFFF' ||
                          token.value === '#DBEAFE' ||
                          token.value === 'transparent'
                          ? 'text-slate-900'
                          : 'text-white'
                      )}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Custom Tab */}
      {activeTab === 'custom' && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <label
              className="relative h-9 w-9 shrink-0 cursor-pointer overflow-hidden rounded-[var(--ne-radius-md)] border border-[var(--ne-border)] shadow-xs"
              style={{ backgroundColor: value }}
            >
              <input
                type="color"
                value={hexValue}
                onChange={e => onChange(e.target.value)}
                className="absolute inset-0 h-full w-full opacity-0 cursor-pointer"
              />
            </label>
            <div className="flex-1 min-w-0">
              <input
                type="text"
                value={value}
                onChange={e => onChange(e.target.value)}
                placeholder="#000000"
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
                onClick={() => onChange(hex)}
                className="h-5 w-5 rounded-full border border-[var(--ne-border)] transition-transform hover:scale-110"
                style={{ backgroundColor: hex }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Popover Footer: Contrast Ratio Preview */}
      {showContrast && (
        <div className="flex items-center justify-between border-t border-[var(--ne-border)] pt-2 text-[11px]">
          <span className="text-[var(--ne-text-muted)]">Contrast ratio:</span>
          <ContrastBadge foreground={value} background={contrastAgainst} />
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
          style={{ backgroundColor: value }}
        />
        <span className="truncate font-mono text-[11px]">
          {matchedToken ? matchedToken.name : value}
        </span>
      </div>
      {showContrast && (
        <ContrastBadge foreground={value} background={contrastAgainst} className="shrink-0" />
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
