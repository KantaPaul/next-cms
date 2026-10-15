'use client';

import { Link2, Link2Off } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils/cn';
import {
  SIDES,
  SPACING_LIMITS,
  SPACING_UNITS,
  type Responsive,
  type Side,
  type Sides,
  type SpacingUnit,
} from '../style';
import { DeviceRow, useCanvasDevice } from './device-row';
import { ControlLabel, Slider } from './primitives';

const SIDE_LABEL: Record<Side, string> = {
  top: 'Top',
  right: 'Right',
  bottom: 'Bottom',
  left: 'Left',
};

/**
 * Four sides in px/rem/em/% for the device the canvas is showing.
 * Header includes label, device icons, link toggle, and an optional unit select.
 */
export function Dimensions({
  label,
  value,
  onChange,
  max,
  unit = 'px',
  onUnitChange,
}: {
  label: string;
  value: Responsive<Sides> | undefined;
  onChange: (value: Responsive<Sides> | undefined) => void;
  max?: number;
  unit?: SpacingUnit;
  onUnitChange?: (unit: SpacingUnit) => void;
}) {
  const [device] = useCanvasDevice();
  const [linked, setLinked] = useState(false);
  const current = value?.[device] ?? {};

  const limits = SPACING_LIMITS[unit] ?? { min: 0, max: max ?? 400, step: 1 };
  const effectiveMax = max ?? limits.max;
  const effectiveStep = limits.step;

  const update = (side: Side, n: number | undefined) => {
    const nextSides: Sides = linked
      ? Object.fromEntries(SIDES.map(s => [s, n]))
      : { ...current, [side]: n };
    const cleaned = Object.fromEntries(
      Object.entries(nextSides).filter(([, v]) => v !== undefined)
    ) as Sides;
    const next = { ...value, [device]: Object.keys(cleaned).length ? cleaned : undefined };
    const hasAny = Object.values(next).some(Boolean);
    onChange(hasAny ? next : undefined);
  };

  return (
    <div>
      <ControlLabel label={label}>
        <div className="flex items-center gap-1.5">
          <DeviceRow />

          <button
            type="button"
            title={linked ? 'Edit sides separately' : 'Link all sides'}
            aria-pressed={linked}
            onClick={() => setLinked(l => !l)}
            className={cn(
              'rounded p-1 text-steel-400 hover:text-indigo-600',
              linked && 'bg-indigo-50 text-indigo-600'
            )}
          >
            {linked ? <Link2 className="size-3.5" /> : <Link2Off className="size-3.5" />}
          </button>

          {onUnitChange && (
            <select
              value={unit}
              aria-label="Unit"
              onChange={e => onUnitChange(e.target.value as SpacingUnit)}
              className="h-5 rounded border border-steel-200 bg-white px-1 text-[10px] font-medium text-steel-700 focus:outline-hidden"
            >
              {SPACING_UNITS.map(u => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          )}
        </div>
      </ControlLabel>

      <div className="space-y-2 rounded-md border border-steel-100 bg-steel-50/60 p-2.5">
        {(linked ? (['top'] as Side[]) : SIDES).map(side => (
          <Slider
            key={side}
            label={linked ? 'All sides' : SIDE_LABEL[side]}
            value={current[side]}
            min={limits.min}
            max={effectiveMax}
            step={effectiveStep}
            unit={unit}
            placeholder="Auto"
            onChange={n => update(side, n)}
          />
        ))}
      </div>
    </div>
  );
}
