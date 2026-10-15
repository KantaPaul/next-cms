'use client';

import { Minus, MoreHorizontal, X } from 'lucide-react';
import type { BorderSettings } from '../style';
import { ColorPicker } from './color-picker';
import { Dimensions } from './dimensions';
import { Choose } from './primitives';

const STYLES = [
  { value: 'none' as const, label: 'None', icon: <X /> },
  { value: 'solid' as const, label: 'Solid', icon: <Minus /> },
  { value: 'dashed' as const, label: 'Dashed', icon: <MoreHorizontal /> },
];

export function BorderControl({
  value,
  onChange,
}: {
  value: BorderSettings | undefined;
  onChange: (value: BorderSettings | undefined) => void;
}) {
  const border = value ?? {};
  const style = border.style ?? 'none';

  return (
    <div className="space-y-3">
      <Choose
        label="Style"
        value={style}
        options={STYLES}
        onChange={next =>
          onChange(
            next === 'none'
              ? undefined
              : {
                  ...border,
                  style: next,
                  width: border.width ?? { desktop: { top: 1, right: 1, bottom: 1, left: 1 } },
                }
          )
        }
      />
      {style !== 'none' && (
        <>
          <ColorPicker
            label="Color"
            value={border.color}
            onChange={color => onChange({ ...border, color })}
            placeholder="Theme border"
          />
          <Dimensions
            label="Width"
            value={border.width}
            max={40}
            onChange={width => onChange({ ...border, width })}
          />
        </>
      )}
    </div>
  );
}
