'use client';

import { Image as ImageIcon, PaintBucket, Palette } from 'lucide-react';
import { MediaField } from '@/components/media/media-picker';
import type { Fill } from '../style';
import { Choose, ColorInput, ControlLabel, SelectInput, Slider } from './primitives';

const TYPES = [
  { value: 'color' as const, label: 'Color', icon: <PaintBucket /> },
  { value: 'gradient' as const, label: 'Gradient', icon: <Palette /> },
  { value: 'image' as const, label: 'Image', icon: <ImageIcon /> },
];

/** Custom background with color, gradient, and image tabs. Clearing it returns to the preset background. */
export function BackgroundControl({ value, onChange }: { value: Fill | undefined; onChange: (value: Fill | undefined) => void }) {
  const fill: Fill = value ?? {};
  const type = fill.type ?? 'color';
  const set = (patch: Partial<Fill>) => onChange({ ...fill, type, ...patch });

  return (
    <div className="space-y-3">
      <Choose
        label="Custom background"
        value={type}
        options={TYPES}
        onChange={next => onChange({ ...fill, type: next })}
        aside={
          value?.type && (
            <button type="button" onClick={() => onChange(undefined)} className="text-[11px] text-steel-500 hover:text-steel-800">
              Reset
            </button>
          )
        }
      />

      {type === 'color' && (
        <div className="grid grid-cols-2 gap-2">
          <ColorInput label="Light" value={fill.color} onChange={color => set({ color })} />
          <ColorInput label="Dark" value={fill.colorDark} onChange={colorDark => set({ colorDark })} placeholder="Same" />
        </div>
      )}

      {type === 'gradient' && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <ColorInput label="Start" value={fill.from} onChange={from => set({ from })} placeholder="#6366f1" />
            <ColorInput label="Stop" value={fill.to} onChange={to => set({ to })} placeholder="#ec4899" />
          </div>
          <Slider label="Angle" value={fill.angle} min={0} max={360} unit="deg" placeholder="135" onChange={angle => set({ angle })} />
          <Slider label="Start location" value={fill.start} min={0} max={100} unit="%" placeholder="0" onChange={start => set({ start })} />
          <Slider label="Stop location" value={fill.end} min={0} max={100} unit="%" placeholder="100" onChange={end => set({ end })} />
        </>
      )}

      {type === 'image' && (
        <>
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
            label="Position"
            value={fill.position ?? 'center'}
            options={[
              { value: 'center', label: 'Center' },
              { value: 'top', label: 'Top' },
              { value: 'bottom', label: 'Bottom' },
              { value: 'left', label: 'Left' },
              { value: 'right', label: 'Right' },
            ]}
            onChange={position => set({ position })}
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
        </>
      )}
    </div>
  );
}
