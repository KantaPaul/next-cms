'use client';

import { FormInput } from '@/components/ui/input';
import type { ImageSize, ImageSizePreset } from '../../style';
import { ControlLabel, SelectInput } from '../primitives';

export interface ImageSizeControlProps {
  value: ImageSize | undefined;
  onChange: (value: ImageSize | undefined) => void;
  exclude?: string[];
}

const SIZE_PRESETS: { value: ImageSizePreset; label: string }[] = [
  { value: 'thumbnail', label: 'Thumbnail - 150 × 150' },
  { value: 'medium', label: 'Medium - 300 × 300' },
  { value: 'large', label: 'Large - 1024 × 1024' },
  { value: 'full', label: 'Full (Original)' },
  { value: 'custom', label: 'Custom' },
];

export function ImageSizeControl({
  value,
  onChange,
  exclude,
}: ImageSizeControlProps) {
  const current = value ?? {};
  const isExcluded = (field: string) => exclude?.includes(field);

  const set = (patch: Partial<ImageSize>) => {
    const next: ImageSize = { ...current, ...patch };
    if (!next.size && next.width === undefined && next.height === undefined) {
      onChange(undefined);
    } else {
      onChange(next);
    }
  };

  const selectedSize = current.size ?? 'full';

  return (
    <div className="space-y-3">
      {!isExcluded('size') && (
        <SelectInput
          label="Image Size"
          value={selectedSize}
          options={SIZE_PRESETS}
          onChange={size => set({ size: (size || 'full') as ImageSizePreset })}
        />
      )}

      {selectedSize === 'custom' && (
        <div className="grid grid-cols-2 gap-2">
          {!isExcluded('width') && (
            <div>
              <ControlLabel label="Width (px)" />
              <FormInput
                type="number"
                min={1}
                max={5000}
                placeholder="Width"
                value={current.width ?? ''}
                onChange={e => {
                  const val = e.target.value ? parseInt(e.target.value, 10) : undefined;
                  set({ width: val && !Number.isNaN(val) ? val : undefined });
                }}
              />
            </div>
          )}
          {!isExcluded('height') && (
            <div>
              <ControlLabel label="Height (px)" />
              <FormInput
                type="number"
                min={1}
                max={5000}
                placeholder="Height"
                value={current.height ?? ''}
                onChange={e => {
                  const val = e.target.value ? parseInt(e.target.value, 10) : undefined;
                  set({ height: val && !Number.isNaN(val) ? val : undefined });
                }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
