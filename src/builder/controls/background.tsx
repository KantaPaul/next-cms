'use client';

import {
  Image as ImageIcon,
  PaintBucket,
  Palette,
  RotateCcw,
  Video,
} from 'lucide-react';
import { MediaField } from '@/components/media/media-picker';
import { Button } from '@/components/ui/button';
import { FormInput } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils/cn';
import type { Fill } from '../style';
import { ColorPicker } from './color-picker';
import { ControlLabel, SelectInput, ShowWhen, Slider } from './primitives';

export type BackgroundType = 'color' | 'gradient' | 'image' | 'video';

const ALL_TYPES = [
  { value: 'color' as const, label: 'Color', icon: PaintBucket },
  { value: 'gradient' as const, label: 'Gradient', icon: Palette },
  { value: 'image' as const, label: 'Image', icon: ImageIcon },
  { value: 'video' as const, label: 'Video', icon: Video },
];

export interface BackgroundControlProps {
  value: Fill | undefined;
  onChange: (value: Fill | undefined) => void;
  types?: BackgroundType[];
  exclude?: string[];
}

/** Custom background with icon tabs in the label row, ColorPicker, and full-width selects. */
export function BackgroundControl({
  value,
  onChange,
  types,
  exclude,
}: BackgroundControlProps) {
  const fill: Fill = value ?? {};
  const type = fill.type ?? 'color';
  const hasCustom = Boolean(value?.type);

  const availableTypes = types?.length
    ? ALL_TYPES.filter(t => types.includes(t.value))
    : ALL_TYPES;

  const set = (patch: Partial<Fill>) => onChange({ ...fill, type, ...patch });
  const isExcluded = (field: string) => exclude?.includes(field);

  return (
    <div className="space-y-3">
      {/* Label row with tabs-in-label */}
      <div className="flex min-h-5 items-center justify-between gap-2">
        <Label>Custom Background</Label>
        <div className="flex items-center gap-1">
          <div className="flex rounded-md border border-steel-200 bg-steel-50/80 p-0.5">
            {availableTypes.map(t => {
              const Icon = t.icon;
              const selected = hasCustom && type === t.value;

              return (
                <Button
                  key={t.value}
                  type="button"
                  variant="ghost"
                  size="icon"
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
              variant="outline"
              size="icon-sm"
              className="ml-1 inline-flex items-center gap-0.5 text-steel-400 hover:text-steel-700"
            >
              <RotateCcw className="size-3.5" />
            </Button>
          )}
        </div>
      </div>

      {hasCustom && type === 'color' && !isExcluded('color') && (
        <div className="grid grid-cols-2 gap-2">
          <ColorPicker
            label="Light"
            value={fill.color}
            onChange={color => set({ color })}
          />
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
          {!isExcluded('gradientType') && (
            <SelectInput
              label="Type"
              value={fill.gradientType ?? 'linear'}
              options={[
                { value: 'linear', label: 'Linear' },
                { value: 'radial', label: 'Radial' },
              ]}
              onChange={gradientType => set({ gradientType })}
            />
          )}
          {!isExcluded('gradientPosition') && (
            <ShowWhen when={(fill.gradientType ?? 'linear') === 'radial'}>
              <SelectInput
                label="Position"
                value={fill.gradientPosition ?? 'center center'}
                options={[
                  { value: 'center center', label: 'Center Center' },
                  { value: 'center left', label: 'Center Left' },
                  { value: 'center right', label: 'Center Right' },
                  { value: 'top center', label: 'Top Center' },
                  { value: 'top left', label: 'Top Left' },
                  { value: 'top right', label: 'Top Right' },
                  { value: 'bottom center', label: 'Bottom Center' },
                  { value: 'bottom left', label: 'Bottom Left' },
                  { value: 'bottom right', label: 'Bottom Right' },
                ]}
                onChange={gradientPosition => set({ gradientPosition })}
              />
            </ShowWhen>
          )}
          <div className="grid grid-cols-2 gap-2">
            <ColorPicker
              label="Start"
              value={fill.from}
              onChange={from => set({ from })}
              placeholder="#6366f1"
            />
            <ColorPicker
              label="Stop"
              value={fill.to}
              onChange={to => set({ to })}
              placeholder="#ec4899"
            />
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
          {!isExcluded('image') && (
            <div>
              <ControlLabel label="Image" />
              <MediaField
                value={fill.image ?? ''}
                onChange={image => set({ image: image || undefined })}
              />
            </div>
          )}
          {!isExcluded('size') && (
            <SelectInput
              label="Size"
              value={(typeof fill.size === 'string' ? fill.size : fill.size?.desktop) ?? 'cover'}
              options={[
                { value: 'cover', label: 'Cover' },
                { value: 'contain', label: 'Contain' },
                { value: 'auto', label: 'Auto' },
              ]}
              onChange={size => set({ size })}
            />
          )}
          {!isExcluded('position') && (
            <SelectInput
              label="Position preset"
              value={(typeof fill.position === 'string' ? fill.position : fill.position?.desktop) ?? 'center'}
              options={[
                { value: 'center', label: 'Center' },
                { value: 'top', label: 'Top' },
                { value: 'bottom', label: 'Bottom' },
                { value: 'left', label: 'Left' },
                { value: 'right', label: 'Right' },
              ]}
              onChange={position =>
                set({ position, posX: undefined, posY: undefined })
              }
            />
          )}
          {!isExcluded('posX') && (
            <Slider
              label="Custom X"
              value={fill.posX}
              min={0}
              max={100}
              unit="%"
              placeholder="50"
              onChange={posX => set({ posX })}
            />
          )}
          {!isExcluded('posY') && (
            <Slider
              label="Custom Y"
              value={fill.posY}
              min={0}
              max={100}
              unit="%"
              placeholder="50"
              onChange={posY => set({ posY })}
            />
          )}
          {!isExcluded('attachment') && (
            <SelectInput
              label="Attachment"
              value={fill.attachment ?? 'scroll'}
              options={[
                { value: 'scroll', label: 'Scroll' },
                { value: 'fixed', label: 'Fixed' },
              ]}
              onChange={attachment => set({ attachment })}
            />
          )}
          {!isExcluded('repeat') && (
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
          )}
        </div>
      )}

      {hasCustom && type === 'video' && (
        <div className="space-y-3">
          <div>
            <ControlLabel label="Video URL" />
            <FormInput
              value={fill.videoUrl ?? ''}
              placeholder="https://.../video.mp4"
              onChange={e => set({ videoUrl: e.target.value || undefined })}
            />
          </div>
          <div>
            <ControlLabel label="Fallback image" />
            <MediaField
              value={fill.videoFallback ?? ''}
              onChange={videoFallback =>
                set({ videoFallback: videoFallback || undefined })
              }
            />
          </div>
        </div>
      )}
    </div>
  );
}
