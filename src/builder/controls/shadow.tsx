'use client';

import { Pencil, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils/cn';
import { clamp, formatShadow, type ShadowSettings, safeColor } from '../style';
import { ColorPicker } from './color-picker';
import { Slider } from './primitives';

const DEFAULT_SHADOW: Required<ShadowSettings> = {
  x: 0,
  y: 4,
  blur: 8,
  spread: 0,
  color: '#000000',
  opacity: 0.15,
  inset: false,
};

const PRESETS: Record<'none' | 'sm' | 'md' | 'lg', ShadowSettings | undefined> =
  {
    none: undefined,
    sm: {
      x: 0,
      y: 1,
      blur: 3,
      spread: 0,
      opacity: 0.1,
      color: '#000000',
      inset: false,
    },
    md: {
      x: 0,
      y: 4,
      blur: 6,
      spread: -1,
      opacity: 0.15,
      color: '#000000',
      inset: false,
    },
    lg: {
      x: 0,
      y: 10,
      blur: 15,
      spread: -3,
      opacity: 0.2,
      color: '#000000',
      inset: false,
    },
  };

function normalizeShadow(
  value: 'none' | 'sm' | 'md' | 'lg' | ShadowSettings | undefined
): ShadowSettings | undefined {
  if (!value || value === 'none') return undefined;

  if (typeof value === 'string') {
    return PRESETS[value] ?? undefined;
  }

  return value;
}

export function ShadowControl({
  value,
  onChange,
  hideLabel = false,
}: {
  value: 'none' | 'sm' | 'md' | 'lg' | ShadowSettings | undefined;
  onChange: (value: ShadowSettings | undefined) => void;
  hideLabel?: boolean;
}) {
  const current = normalizeShadow(value);
  const s = { ...DEFAULT_SHADOW, ...current };
  const shadowCss = current ? formatShadow(s) : null;

  const set = (patch: Partial<ShadowSettings>) => {
    onChange({ ...s, ...patch });
  };

  return (
    <div>
      <div className={cn("mb-1.5 flex min-h-5 items-center gap-2", hideLabel ? "justify-end" : "justify-between")}>
        {!hideLabel && (
          <Label className="text-xs font-medium text-steel-600">Shadow</Label>
        )}
        <div className="flex items-center gap-2">
          <div
            title={shadowCss ?? 'No shadow'}
            className="flex size-5 items-center justify-center rounded border border-border bg-background shadow-xs"
            style={shadowCss ? { boxShadow: shadowCss } : undefined}
          />

          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                title="Edit shadow"
                aria-label="Edit shadow"
                className={cn(
                  'size-6 text-muted-foreground',
                  current && 'border-primary/40 bg-primary/5 text-primary'
                )}
              >
                <Pencil className="size-3" />
              </Button>
            </PopoverTrigger>

            <PopoverContent
              align="start"
              side="left"
              sideOffset={8}
              className="w-72 space-y-3.5 p-3.5"
            >
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-muted-foreground">
                    Presets
                  </span>
                  {current && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => onChange(undefined)}
                      className="h-auto gap-1 px-1 py-0 text-[11px] text-muted-foreground"
                    >
                      <RotateCcw className="size-2.5" /> Clear
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {(['none', 'sm', 'md', 'lg'] as const).map(key => {
                    const preset = PRESETS[key];
                    const isSelected =
                      key === 'none'
                        ? !current
                        : current?.blur === preset?.blur &&
                          current?.y === preset?.y;

                    return (
                      <Button
                        key={key}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => onChange(preset)}
                        className={cn(
                          'h-7 text-xs font-medium',
                          isSelected &&
                            'border-primary bg-primary/5 text-primary'
                        )}
                      >
                        {key === 'none' ? 'None' : key.toUpperCase()}
                      </Button>
                    );
                  })}
                </div>
              </div>

              <Separator />

              <div className="space-y-2.5">
                <Slider
                  label="Horizontal (X)"
                  value={s.x}
                  min={-50}
                  max={50}
                  step={1}
                  unit="px"
                  onChange={x => set({ x: x ?? 0 })}
                />
                <Slider
                  label="Vertical (Y)"
                  value={s.y}
                  min={-50}
                  max={50}
                  step={1}
                  unit="px"
                  onChange={y => set({ y: y ?? 0 })}
                />
                <Slider
                  label="Blur"
                  value={s.blur}
                  min={0}
                  max={100}
                  step={1}
                  unit="px"
                  onChange={blur => set({ blur: blur ?? 0 })}
                />
                <Slider
                  label="Spread"
                  value={s.spread}
                  min={-50}
                  max={50}
                  step={1}
                  unit="px"
                  onChange={spread => set({ spread: spread ?? 0 })}
                />
                <Slider
                  label="Opacity"
                  value={Math.round(s.opacity * 100)}
                  min={0}
                  max={100}
                  step={5}
                  unit="%"
                  onChange={v => set({ opacity: (v ?? 100) / 100 })}
                />
              </div>

              <Separator />

              <div className="space-y-3">
                <ColorPicker
                  label="Shadow color"
                  value={s.color}
                  onChange={color => set({ color: color ?? '#000000' })}
                />

                <div className="flex items-center justify-between gap-2">
                  <Label className="text-xs font-medium text-steel-600">
                    Inset shadow
                  </Label>
                  <Switch
                    checked={!!s.inset}
                    onChange={checked => set({ inset: !!checked })}
                  />
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  );
}
