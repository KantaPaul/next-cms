'use client';

import { Pencil, RotateCcw } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils/cn';
import { formatShadow, type ShadowSettings } from '../style';
import { ColorPicker } from './color-picker';
import { ControlLabel, Slider } from './primitives';

const DEFAULT_SHADOW: Required<ShadowSettings> = {
  x: 0,
  y: 4,
  blur: 8,
  spread: 0,
  color: '#000000',
  opacity: 0.15,
  inset: false,
};

const PRESETS: Record<'none' | 'sm' | 'md' | 'lg', ShadowSettings | undefined> = {
  none: undefined,
  sm: { x: 0, y: 1, blur: 3, spread: 0, opacity: 0.1, color: '#000000', inset: false },
  md: { x: 0, y: 4, blur: 6, spread: -1, opacity: 0.15, color: '#000000', inset: false },
  lg: { x: 0, y: 10, blur: 15, spread: -3, opacity: 0.2, color: '#000000', inset: false },
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
}: {
  value: 'none' | 'sm' | 'md' | 'lg' | ShadowSettings | undefined;
  onChange: (value: ShadowSettings | undefined) => void;
}) {
  const current = normalizeShadow(value);
  const s = { ...DEFAULT_SHADOW, ...current };
  const shadowCss = current ? formatShadow(s) : null;

  const set = (patch: Partial<ShadowSettings>) => {
    onChange({ ...s, ...patch });
  };

  return (
    <div>
      <div className="mb-1.5 flex min-h-5 items-center justify-between gap-2">
        <label className="text-xs font-medium text-steel-600">Shadow</label>
        <div className="flex items-center gap-2">
          {/* Live preview chip */}
          <div
            title={shadowCss ?? 'No shadow'}
            className="flex size-5 items-center justify-center rounded border border-steel-200 bg-white shadow-xs"
            style={shadowCss ? { boxShadow: shadowCss } : undefined}
          />

          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                title="Edit shadow"
                aria-label="Edit shadow"
                className={cn(
                  'flex size-6 items-center justify-center rounded border border-steel-200 bg-white text-steel-600 transition hover:bg-steel-50 hover:text-steel-900',
                  current && 'border-indigo-300 bg-indigo-50 text-indigo-600'
                )}
              >
                <Pencil className="size-3" />
              </button>
            </PopoverTrigger>

            <PopoverContent
              align="start"
              side="left"
              sideOffset={8}
              className="w-72 space-y-3.5 rounded-lg border border-steel-200 bg-white p-3.5 shadow-xl"
            >
              {/* Presets row */}
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-steel-500">Presets</span>
                  {current && (
                    <button
                      type="button"
                      onClick={() => onChange(undefined)}
                      className="inline-flex items-center gap-1 text-[11px] text-steel-400 hover:text-steel-700"
                    >
                      <RotateCcw className="size-2.5" /> Clear
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {(['none', 'sm', 'md', 'lg'] as const).map(key => {
                    const preset = PRESETS[key];
                    const isSelected =
                      key === 'none'
                        ? !current
                        : current?.blur === preset?.blur && current?.y === preset?.y;

                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => onChange(preset)}
                        className={cn(
                          'rounded border py-1 text-center text-xs font-medium transition',
                          isSelected
                            ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                            : 'border-steel-200 text-steel-600 hover:bg-steel-50'
                        )}
                      >
                        {key === 'none' ? 'None' : key.toUpperCase()}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Sliders */}
              <div className="space-y-2.5 border-t border-steel-100 pt-3">
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

              {/* Color and Inset */}
              <div className="space-y-3 border-t border-steel-100 pt-3">
                <ColorPicker
                  label="Shadow color"
                  value={s.color}
                  onChange={color => set({ color: color ?? '#000000' })}
                />

                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-steel-600">Inset shadow</label>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={s.inset}
                    onClick={() => set({ inset: !s.inset })}
                    className={cn(
                      'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden',
                      s.inset ? 'bg-indigo-600' : 'bg-steel-200'
                    )}
                  >
                    <span
                      className={cn(
                        'pointer-events-none inline-block size-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out',
                        s.inset ? 'translate-x-4' : 'translate-x-0'
                      )}
                    />
                  </button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  );
}
