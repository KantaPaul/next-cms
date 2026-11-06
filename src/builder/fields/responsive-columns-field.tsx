'use client';

import { useCanvasDevice } from '../controls/device-row';

type Device = 'desktop' | 'tablet' | 'mobile';
type Props = {
  name: string;
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  readOnly?: boolean;
  field: { label?: string; options?: { label: string; value: number }[] };
};

const ACTIVE_FOR: Record<string, Device> = {
  columnsDesktop: 'desktop',
  columnsTablet: 'tablet',
  columnsMobile: 'mobile',
};

export function ResponsiveColumnsField({ name, value, onChange, readOnly, field }: Props) {
  const [device] = useCanvasDevice();
  const active = ACTIVE_FOR[name];
  if (active && device !== active) return null;

  const options = field.options ?? [
    { label: '1 column', value: 1 },
    { label: '2 columns', value: 2 },
    { label: '3 columns', value: 3 },
  ];
  const fallback = typeof value === 'number' ? value : (options[1]?.value ?? options[0]?.value ?? 1);
  const safe = options.some(o => o.value === fallback) ? fallback : (options[1]?.value ?? options[0]?.value ?? 1);

  return (
    <select
      value={safe}
      disabled={readOnly}
      onChange={e => onChange(Number(e.target.value))}
      className="h-9 w-full rounded-md border border-steel-200 bg-white px-2 text-sm text-foreground"
      aria-label={field.label || 'Columns'}
      title={`Editing ${device} columns (switch canvas device to edit other breakpoints)`}
    >
      {options.map(o => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}
