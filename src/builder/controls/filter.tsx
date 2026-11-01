'use client';

import type { FilterSettings } from '../style';
import { Slider } from './primitives';

const ROWS: {
  key: keyof FilterSettings;
  label: string;
  min: number;
  max: number;
  unit: string;
  fallback: number;
}[] = [
  { key: 'blur', label: 'Blur', min: 0, max: 10, unit: 'px', fallback: 0 },
  {
    key: 'brightness',
    label: 'Brightness',
    min: 0,
    max: 200,
    unit: '%',
    fallback: 100,
  },
  {
    key: 'contrast',
    label: 'Contrast',
    min: 0,
    max: 200,
    unit: '%',
    fallback: 100,
  },
  {
    key: 'saturate',
    label: 'Saturation',
    min: 0,
    max: 200,
    unit: '%',
    fallback: 100,
  },
  {
    key: 'grayscale',
    label: 'Grayscale',
    min: 0,
    max: 100,
    unit: '%',
    fallback: 0,
  },
  { key: 'hue', label: 'Hue', min: 0, max: 360, unit: '°', fallback: 0 },
];

/** CSS filter group: blur, brightness, contrast, saturation, grayscale, hue. */
export function FilterControl({
  value,
  onChange,
  exclude,
}: {
  value: FilterSettings | undefined;
  onChange: (value: FilterSettings | undefined) => void;
  exclude?: string[];
}) {
  const f = value ?? {};
  const visibleRows = exclude?.length
    ? ROWS.filter(r => !exclude.includes(r.key))
    : ROWS;

  return (
    <div className="space-y-3">
      {visibleRows.map(r => (
        <Slider
          key={r.key}
          label={r.label}
          value={f[r.key]}
          min={r.min}
          max={r.max}
          unit={r.unit}
          placeholder={String(r.fallback)}
          onChange={n => {
            const next = { ...f, [r.key]: n };
            if (n === undefined) delete next[r.key];
            onChange(Object.keys(next).length ? next : undefined);
          }}
        />
      ))}
    </div>
  );
}
