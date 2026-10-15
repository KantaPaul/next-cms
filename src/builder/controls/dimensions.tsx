'use client';

import { Link2, Link2Off } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils/cn';
import { SIDES, type Responsive, type Side, type Sides } from '../style';
import { DeviceRow, useCanvasDevice } from './device-row';
import { ControlLabel, Slider } from './primitives';

const SIDE_LABEL: Record<Side, string> = { top: 'Top', right: 'Right', bottom: 'Bottom', left: 'Left' };

/**
 * Four sides in px for the device the canvas is showing. A side left empty falls back to the nearest device
 * that sets it, then to the block's preset.
 */
export function Dimensions({
  label,
  value,
  onChange,
  max,
}: {
  label: string;
  value: Responsive<Sides> | undefined;
  onChange: (value: Responsive<Sides> | undefined) => void;
  max: number;
}) {
  const [device] = useCanvasDevice();
  const [linked, setLinked] = useState(false);
  const current = value?.[device] ?? {};

  const update = (side: Side, n: number | undefined) => {
    const nextSides: Sides = linked ? Object.fromEntries(SIDES.map(s => [s, n])) : { ...current, [side]: n };
    const cleaned = Object.fromEntries(Object.entries(nextSides).filter(([, v]) => v !== undefined)) as Sides;
    const next = { ...value, [device]: Object.keys(cleaned).length ? cleaned : undefined };
    const hasAny = Object.values(next).some(Boolean);
    onChange(hasAny ? next : undefined);
  };

  return (
    <div>
      <ControlLabel label={label}>
        <div className="flex items-center gap-1">
          <DeviceRow />
          <button
            type="button"
            title={linked ? 'Edit sides separately' : 'Link all sides'}
            aria-pressed={linked}
            onClick={() => setLinked(l => !l)}
            className={cn('rounded p-1 text-steel-400 hover:text-indigo-600', linked && 'bg-indigo-50 text-indigo-600')}
          >
            {linked ? <Link2 className="size-3.5" /> : <Link2Off className="size-3.5" />}
          </button>
        </div>
      </ControlLabel>
      <div className="space-y-2 rounded-md border border-steel-100 bg-steel-50/60 p-2.5">
        {(linked ? (['top'] as Side[]) : SIDES).map(side => (
          <Slider
            key={side}
            label={linked ? 'All sides' : SIDE_LABEL[side]}
            value={current[side]}
            min={0}
            max={max}
            unit="px"
            placeholder="Auto"
            onChange={n => update(side, n)}
          />
        ))}
      </div>
    </div>
  );
}
