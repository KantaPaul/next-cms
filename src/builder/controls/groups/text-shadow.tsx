'use client';

import type { TextShadowSettings } from '../../style';
import { ColorPicker } from '../color-picker';
import { Slider } from '../primitives';

export interface TextShadowControlProps {
  value: TextShadowSettings | undefined;
  onChange: (value: TextShadowSettings | undefined) => void;
  exclude?: string[];
}

export function TextShadowControl({
  value,
  onChange,
  exclude,
}: TextShadowControlProps) {
  const shadow = value ?? {};
  const isExcluded = (field: string) => exclude?.includes(field);

  const set = (patch: Partial<TextShadowSettings>) => {
    const next: TextShadowSettings = { ...shadow, ...patch };
    if (
      next.x === undefined &&
      next.y === undefined &&
      next.blur === undefined &&
      !next.color
    ) {
      onChange(undefined);
    } else {
      onChange(next);
    }
  };

  return (
    <div className="space-y-3">
      {!isExcluded('color') && (
        <ColorPicker
          label="Shadow color"
          value={shadow.color}
          onChange={color => set({ color: color || undefined })}
        />
      )}
      {!isExcluded('blur') && (
        <Slider
          label="Blur"
          value={shadow.blur}
          min={0}
          max={100}
          unit="px"
          placeholder="0"
          onChange={blur => set({ blur })}
        />
      )}
      {!isExcluded('x') && !isExcluded('horizontal') && (
        <Slider
          label="Horizontal"
          value={shadow.x}
          min={-50}
          max={50}
          unit="px"
          placeholder="0"
          onChange={x => set({ x })}
        />
      )}
      {!isExcluded('y') && !isExcluded('vertical') && (
        <Slider
          label="Vertical"
          value={shadow.y}
          min={-50}
          max={50}
          unit="px"
          placeholder="0"
          onChange={y => set({ y })}
        />
      )}
    </div>
  );
}
