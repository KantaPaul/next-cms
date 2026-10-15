'use client';

import { Minus, MoreHorizontal, X } from 'lucide-react';
import type { BorderSettings } from '../style';
import { Dimensions } from './dimensions';
import { Choose, ColorInput } from './primitives';

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
        onChange={next => onChange(next === 'none' ? undefined : { ...border, style: next, width: border.width ?? { desktop: { top: 1, right: 1, bottom: 1, left: 1 } } })}
      />
      {style !== 'none' && (
        <>
          <ColorInput label="Color" value={border.color} onChange={color => onChange({ ...border, color })} placeholder="Theme border" />
          <Dimensions label="Width" value={border.width} max={40} onChange={width => onChange({ ...border, width })} />
        </>
      )}
    </div>
  );
}

export function ShadowControl({
  value,
  onChange,
}: {
  value: 'none' | 'sm' | 'md' | 'lg' | undefined;
  onChange: (value: 'none' | 'sm' | 'md' | 'lg') => void;
}) {
  return (
    <Choose
      label="Shadow"
      value={value ?? 'none'}
      options={[
        { value: 'none', label: 'None' },
        { value: 'sm', label: 'Small' },
        { value: 'md', label: 'Medium' },
        { value: 'lg', label: 'Large' },
      ]}
      onChange={onChange}
    />
  );
}
