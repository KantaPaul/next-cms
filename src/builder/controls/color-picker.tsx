'use client';

import { Paintbrush, X } from 'lucide-react';
import { type ReactNode, useEffect, useState } from 'react';
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
import { useEditorBridge } from './editor-bridge';
import { ControlLabel } from './primitives';


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
  const { themeTokens } = useEditorBridge();
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
            <Button
              type="button"
              variant="outline"
              title={value ?? placeholder}
              aria-label={label ? `${label} color picker` : 'Color picker'}
              className="relative h-6 w-14 shrink-0 overflow-hidden rounded border border-border bg-[repeating-conic-gradient(#e2e8f0_0_25%,#fff_0_50%)] bg-[length:8px_8px] p-0 shadow-xs hover:border-muted-foreground"
            >
              {value ? (
                <span
                  className="absolute inset-0"
                  style={{ backgroundColor: value }}
                />
              ) : (
                <Paintbrush className="size-3 text-muted-foreground" />
              )}
            </Button>
          </PopoverTrigger>

          <span className="truncate font-mono text-xs text-foreground">
            {value ? (
              value.toUpperCase()
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
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
          <div className="overflow-hidden rounded-md [&_.react-colorful]:h-36 [&_.react-colorful]:w-full">
            <HexColorPicker
              color={safeColor(value) ?? '#6366f1'}
              onChange={handleColorChange}
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-muted-foreground">
              HEX
            </span>
            <FormInput
              type="text"
              value={draft}
              placeholder="#000000"
              onChange={e => setDraft(e.target.value)}
              onBlur={e => commitHex(e.target.value)}
              onKeyDown={e =>
                e.key === 'Enter' && commitHex(e.currentTarget.value)
              }
              className="h-7 flex-1 bg-muted/40 px-2 font-mono text-xs uppercase"
            />
            {value && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onChange(undefined)}
                className="h-7 px-2 text-[11px] text-muted-foreground"
              >
                Clear
              </Button>
            )}
          </div>

          <div>
            <p className="mb-1.5 text-[11px] font-medium text-muted-foreground">
              Theme Swatches
            </p>
            <div className="flex flex-wrap gap-1.5">
              {swatches.map(swatch => (
                <Button
                  key={swatch}
                  type="button"
                  variant="outline"
                  title={swatch}
                  onClick={() => handleColorChange(swatch)}
                  style={{ backgroundColor: swatch }}
                  className={cn(
                    'size-5 rounded-full border-black/10 p-0 hover:scale-110',
                    value?.toLowerCase() === swatch.toLowerCase() &&
                      'ring-2 ring-primary ring-offset-1'
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
