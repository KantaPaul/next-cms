'use client';

import { Image as ImageIcon, PaintBucket, Palette, RotateCcw } from 'lucide-react';
import { MediaField } from '@/components/media/media-picker';
import { cn } from '@/lib/utils/cn';
import type { Fill } from '../style';
import { ColorPicker } from './color-picker';
import { ControlLabel, SelectInput, ShowWhen, Slider } from './primitives';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

const TYPES = [
  { value: 'color' as const, label: 'Color', icon: PaintBucket },
  { value: 'gradient' as const, label: 'Gradient', icon: Palette },
  { value: 'image' as const, label: 'Image', icon: ImageIcon },
];

/** Custom background with icon tabs in the label row, ColorPicker, and full-width selects. */
export function BackgroundControl({
  value,
  onChange,
}: {
  value: Fill | undefined;
  onChange: (value: Fill | undefined) => void;
}) {
  const fill: Fill = value ?? {};
  const type = fill.type ?? 'color';
  const hasCustom = Boolean(value?.type);

  const set = (patch: Partial<Fill>) => onChange({ ...fill, type, ...patch });

  return (
    <div className="space-y-3">
      {/* Label row with tabs-in-label */}
      <div className="flex min-h-5 items-center justify-between gap-2">
        <Label>Custom background</Label>
        <div className="flex items-center gap-1">
          <div className="flex rounded-md border border-steel-200 bg-steel-50/80 p-0.5">
            {TYPES.map(t => {
              const Icon = t.icon;
              const selected = hasCustom && type === t.value;

              return (
                <Button
                  key={t.value}
                  type="button"
                  title={t.label}
                  aria-label={t.label}
                  aria-pressed={selected}
                  onClick={() => onChange({ ...fill, type: t.value })}
                  className={cn(
                    'flex size-6 items-center justify-center rounded text-steel-500 transition hover:text-steel-900',
                    selected && 'bg-white text-indigo-600 shadow-xs font-medium'
                  )}
                >
                  <Icon className="size-3.5" />
                </Button>
              );
            })}
          </div>

          {hasCustom && (
            <Button
              type="button"
              title="Reset background"
              onClick={() => onChange(undefined)}
              className="ml-1 inline-flex items-center gap-0.5 text-[11px] text-steel-400 hover:text-steel-700"
            >
              <RotateCcw className="size-2.5" />
            </Button>
          )}
        </div>
      </div>

      {hasCustom && type === 'color' && (
        <div className="grid grid-cols-2 gap-2">
          <ColorPicker label="Light" value={fill.color} onChange={color => set({ color })} />
          <ColorPicker
            label="Dark"
            value={fill.colorDark}
            onChange={colorDark => set({ colorDark })}
            placeholder="Same"
          />
        </div>
      )}

      {hasCustom && type === 'gradient' && (
        <div className="space-y-3">
          <SelectInput
            label="Type"
            value={fill.gradientType ?? 'linear'}
            options={[
              { value: 'linear', label: 'Linear' },
              { value: 'radial', label: 'Radial' },
            ]}
            onChange={gradientType => set({ gradientType })}
          />
          <div className="grid grid-cols-2 gap-2">
            <ColorPicker label="Start" value={fill.from} onChange={from => set({ from })} placeholder="#6366f1" />
            <ColorPicker label="Stop" value={fill.to} onChange={to => set({ to })} placeholder="#ec4899" />
          </div>
          <ShowWhen when={(fill.gradientType ?? 'linear') === 'linear'}>
            <Slider
              label="Angle"
              value={fill.angle}
              min={0}
              max={360}
              unit="deg"
              placeholder="135"
              onChange={angle => set({ angle })}
            />
          </ShowWhen>
          <Slider
            label="Start location"
            value={fill.start}
            min={0}
            max={100}
            unit="%"
            placeholder="0"
            onChange={start => set({ start })}
          />
          <Slider
            label="Stop location"
            value={fill.end}
            min={0}
            max={100}
            unit="%"
            placeholder="100"
            onChange={end => set({ end })}
          />
        </div>
      )}

      {hasCustom && type === 'image' && (
        <div className="space-y-3">
          <div>
            <ControlLabel label="Image" />
            <MediaField value={fill.image ?? ''} onChange={image => set({ image: image || undefined })} />
          </div>
          <SelectInput
            label="Size"
            value={fill.size ?? 'cover'}
            options={[
              { value: 'cover', label: 'Cover' },
              { value: 'contain', label: 'Contain' },
              { value: 'auto', label: 'Auto' },
            ]}
            onChange={size => set({ size })}
          />
          <SelectInput
            label="Position preset"
            value={fill.position ?? 'center'}
            options={[
              { value: 'center', label: 'Center' },
              { value: 'top', label: 'Top' },
              { value: 'bottom', label: 'Bottom' },
              { value: 'left', label: 'Left' },
              { value: 'right', label: 'Right' },
            ]}
            onChange={position => set({ position, posX: undefined, posY: undefined })}
          />
          <Slider
            label="Custom X"
            value={fill.posX}
            min={0}
            max={100}
            unit="%"
            placeholder="50"
            onChange={posX => set({ posX })}
          />
          <Slider
            label="Custom Y"
            value={fill.posY}
            min={0}
            max={100}
            unit="%"
            placeholder="50"
            onChange={posY => set({ posY })}
          />
          <SelectInput
            label="Attachment"
            value={fill.attachment ?? 'scroll'}
            options={[
              { value: 'scroll', label: 'Scroll' },
              { value: 'fixed', label: 'Fixed' },
            ]}
            onChange={attachment => set({ attachment })}
          />
          <SelectInput
            label="Repeat"
            value={fill.repeat ?? 'no-repeat'}
            options={[
              { value: 'no-repeat', label: 'No repeat' },
              { value: 'repeat', label: 'Repeat' },
              { value: 'repeat-x', label: 'Repeat X' },
              { value: 'repeat-y', label: 'Repeat Y' },
            ]}
            onChange={repeat => set({ repeat })}
          />
        </div>
      )}
    </div>
  );
}
