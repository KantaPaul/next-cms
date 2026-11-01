'use client';

import type { TextStrokeSettings } from '../../style';
import { ColorPicker } from '../color-picker';
import { Slider } from '../primitives';

export interface TextStrokeControlProps {
  value: TextStrokeSettings | undefined;
  onChange: (value: TextStrokeSettings | undefined) => void;
  exclude?: string[];
}

export function TextStrokeControl({
  value,
  onChange,
  exclude,
}: TextStrokeControlProps) {
  const stroke = value ?? {};
  const isExcluded = (field: string) => exclude?.includes(field);

  const set = (patch: Partial<TextStrokeSettings>) => {
    const next: TextStrokeSettings = { ...stroke, ...patch };
    if (next.width === undefined && !next.color) {
      onChange(undefined);
    } else {
      onChange(next);
    }
  };

  const rawWidth =
    typeof stroke.width === 'number'
      ? stroke.width
      : stroke.width?.desktop;

  return (
    <div className="space-y-3">
      {!isExcluded('width') && (
        <Slider
          label="Width"
          value={rawWidth}
          min={0}
          max={20}
          unit="px"
          placeholder="0"
          onChange={w => {
            if (typeof stroke.width === 'object' && stroke.width !== null) {
              set({ width: { ...stroke.width, desktop: w } });
            } else {
              set({ width: w });
            }
          }}
        />
      )}
      {!isExcluded('color') && (
        <ColorPicker
          label="Stroke color"
          value={stroke.color}
          onChange={color => set({ color: color || undefined })}
        />
      )}
    </div>
  );
}
