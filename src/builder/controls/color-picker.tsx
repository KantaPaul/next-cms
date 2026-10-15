'use client';

import { createUsePuck } from '@measured/puck';
import { Paintbrush, X } from 'lucide-react';
import { HexColorPicker } from 'react-colorful';
import { useEffect, useState, type ReactNode } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils/cn';
import { safeColor } from '../style';
import { ControlLabel } from './primitives';

const usePuck = createUsePuck();

const DEFAULT_SWATCHES = [
  '#6366f1',
  '#ec4899',
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#0f172a',
  '#64748b',
  '#e2e8f0',
  '#ffffff',
];

const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

export type ColorPickerProps = {
  label?: string;
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  placeholder?: string;
  aside?: ReactNode;
  responsive?: boolean;
};

export function ColorPicker({
  label,
  value,
  onChange,
  placeholder = 'Inherit',
  aside,
  responsive,
}: ColorPickerProps) {
  const themeTokens = usePuck(s => {
    const anyS = s as unknown as { metadata?: { themeTokens?: Record<string, string> }; appState?: { metadata?: { themeTokens?: Record<string, string> } } };
    return anyS?.metadata?.themeTokens ?? anyS?.appState?.metadata?.themeTokens;
  });
  const [draft, setDraft] = useState(value ?? '');

  useEffect(() => {
    setDraft(value ?? '');
  }, [value]);

  const swatches = [
    ...(themeTokens?.primaryColor ? [themeTokens.primaryColor] : []),
    ...(themeTokens?.accentColor ? [themeTokens.accentColor] : []),
    ...DEFAULT_SWATCHES.filter(
      c => c !== themeTokens?.primaryColor && c !== themeTokens?.accentColor
    ),
  ].slice(0, 10);

  const commitHex = (raw: string) => {
    const trimmed = raw.trim();

    if (!trimmed) {
      onChange(undefined);
      return;
    }

    const withHash = trimmed.startsWith('#') ? trimmed : `#${trimmed}`;

    if (HEX.test(withHash)) {
      onChange(withHash.toLowerCase());
    } else {
      setDraft(value ?? '');
    }
  };

  const handleColorChange = (newColor: string) => {
    setDraft(newColor);
    onChange(newColor.toLowerCase());
  };

  return (
    <div>
      {label && (
        <ControlLabel label={label} responsive={responsive}>
          {aside}
        </ControlLabel>
      )}

      <Popover>
        <div className="flex items-center gap-2">
          <PopoverTrigger asChild>
            <button
              type="button"
              title={value ?? placeholder}
              aria-label={label ? `${label} color picker` : 'Color picker'}
              className="relative flex h-6 w-14 shrink-0 items-center justify-center overflow-hidden rounded border border-steel-200 bg-[repeating-conic-gradient(#e2e8f0_0_25%,#fff_0_50%)] bg-[length:8px_8px] shadow-xs transition hover:border-steel-400 focus:ring-2 focus:ring-indigo-500/20 focus:outline-hidden"
            >
              {value ? (
                <span className="absolute inset-0" style={{ backgroundColor: value }} />
              ) : (
                <Paintbrush className="size-3 text-steel-400" />
              )}
            </button>
          </PopoverTrigger>

          <span className="truncate font-mono text-xs text-steel-600">
            {value ? value.toUpperCase() : <span className="text-steel-400">{placeholder}</span>}
          </span>

          {value && (
            <button
              type="button"
              aria-label="Clear color"
              onClick={() => onChange(undefined)}
              className="ml-auto text-steel-400 hover:text-steel-700"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        <PopoverContent
          align="start"
          side="left"
          sideOffset={8}
          className="w-64 space-y-3 rounded-lg border border-steel-200 bg-white p-3 shadow-xl"
        >
          <div className="overflow-hidden rounded-md [&_.react-colorful]:w-full [&_.react-colorful]:h-36">
            <HexColorPicker
              color={safeColor(value) ?? '#6366f1'}
              onChange={handleColorChange}
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-steel-500">HEX</span>
            <input
              type="text"
              value={draft}
              placeholder="#000000"
              onChange={e => setDraft(e.target.value)}
              onBlur={e => commitHex(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && commitHex(e.currentTarget.value)}
              className="h-7 min-w-0 flex-1 rounded border border-steel-200 bg-steel-50 px-2 font-mono text-xs text-steel-800 uppercase focus:border-indigo-500 focus:bg-white focus:outline-hidden"
            />
            {value && (
              <button
                type="button"
                onClick={() => onChange(undefined)}
                className="rounded px-2 py-1 text-[11px] font-medium text-steel-500 hover:bg-steel-100 hover:text-steel-800"
              >
                Clear
              </button>
            )}
          </div>

          <div>
            <p className="mb-1.5 text-[11px] font-medium text-steel-400">Theme Swatches</p>
            <div className="flex flex-wrap gap-1.5">
              {swatches.map(swatch => (
                <button
                  key={swatch}
                  type="button"
                  title={swatch}
                  onClick={() => handleColorChange(swatch)}
                  style={{ backgroundColor: swatch }}
                  className={cn(
                    'size-5 rounded-full border border-black/10 transition-transform hover:scale-110 focus:ring-2 focus:ring-indigo-500/30 focus:outline-hidden',
                    value?.toLowerCase() === swatch.toLowerCase() && 'ring-2 ring-indigo-600 ring-offset-1'
                  )}
                />
              ))}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
