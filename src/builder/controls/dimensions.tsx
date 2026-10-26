'use client';

import { Link2, Link2Off } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils/cn';
import {
  type Responsive,
  SIDES,
  type Side,
  type Sides,
  SPACING_LIMITS,
  SPACING_UNITS,
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
    const next = {
      ...value,
      [device]: Object.keys(cleaned).length ? cleaned : undefined,
    };
    const hasAny = Object.values(next).some(Boolean);
    onChange(hasAny ? next : undefined);
  };

  return (
    <div>
      <ControlLabel label={label}>
        <div className="flex items-center gap-1.5">
          <DeviceRow />

          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            title={linked ? 'Edit sides separately' : 'Link all sides'}
            aria-pressed={linked}
            onClick={() => setLinked(l => !l)}
            className={cn(
              'size-6 text-muted-foreground hover:text-primary',
              linked &&
                'bg-primary/10 text-primary hover:bg-primary/10 hover:text-primary'
            )}
          >
            {linked ? (
              <Link2 className="size-3.5" />
            ) : (
              <Link2Off className="size-3.5" />
            )}
          </Button>

          {onUnitChange && (
            <Select
              value={unit}
              onValueChange={v => onUnitChange(v as SpacingUnit)}
            >
              <SelectTrigger
                size="sm"
                aria-label="Unit"
                className="h-5 w-auto min-w-12 gap-0.5 border-border px-1 text-[10px] font-medium"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SPACING_UNITS.map(u => (
                  <SelectItem key={u} value={u} className="text-xs">
                    {u}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </ControlLabel>

      <div className="space-y-2 rounded-md border border-border bg-muted/40 p-2.5">
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
