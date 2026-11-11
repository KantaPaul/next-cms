'use client';

import { Link2, Link2Off } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils/cn';
import {
  type ContainerSettings,
  LENGTH_LIMITS,
  LENGTH_UNITS,
  type LengthUnit,
  type Responsive,
} from '../../style';
import { ControlLabel, UnitSlider } from '../primitives';

function hasAnyValues(r: Responsive<number> | undefined): boolean {
  return (
    !!r &&
    typeof r === 'object' &&
    Object.values(r).some(v => v !== undefined)
  );
}

/** Patch produced by editing linked `gap`: clears `columnGap` and `rowGap`. */
export function linkedGapPatch(
  gap: Responsive<number> | undefined,
  gapUnit: LengthUnit
): Partial<ContainerSettings> {
  return { gap, gapUnit, columnGap: undefined, rowGap: undefined };
}

/** Patch produced by editing unlinked `columnGap` or `rowGap`: clears `gap`. */
export function unlinkedGapPatch(
  prop: 'columnGap' | 'rowGap',
  val: Responsive<number> | undefined,
  gapUnit: LengthUnit
): Partial<ContainerSettings> {
  return { [prop]: val, gapUnit, gap: undefined };
}

/** Patch produced by toggling the gap link button. */
export function toggleGapLinkPatch(
  c: ContainerSettings,
  nextLinked: boolean
): Partial<ContainerSettings> {
  if (!nextLinked) {
    if (hasAnyValues(c.gap)) {
      return {
        gap: undefined,
        columnGap: { ...c.gap },
        rowGap: { ...c.gap },
      };
    }
    return { gap: undefined };
  }
  const merged = c.columnGap ?? c.rowGap;
  return {
    gap: merged ? { ...merged } : undefined,
    columnGap: undefined,
    rowGap: undefined,
  };
}

/**
 * Linked Gap input: linked edits `gap` and clears `columnGap`/`rowGap`;
 * unlinked edits `columnGap` and `rowGap` and clears `gap` so they can never conflict.
 */
export function LinkedGapInput({
  value,
  onChange,
}: {
  value: ContainerSettings | undefined;
  onChange: (patch: Partial<ContainerSettings>) => void;
}) {
  const c = value ?? {};
  const hasLonghands = hasAnyValues(c.columnGap) || hasAnyValues(c.rowGap);
  const [linked, setLinked] = useState(!hasLonghands);

  useEffect(() => {
    if (hasAnyValues(c.columnGap) || hasAnyValues(c.rowGap)) {
      setLinked(false);
    } else if (hasAnyValues(c.gap)) {
      setLinked(true);
    }
  }, [c.gap, c.columnGap, c.rowGap]);

  const toggleLinked = () => {
    const nextLinked = !linked;
    setLinked(nextLinked);
    onChange(toggleGapLinkPatch(c, nextLinked));
  };

  const linkButton = (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      title={linked ? 'Split column and row gap' : 'Link column and row gap'}
      aria-label={linked ? 'Unlink gap' : 'Link gap'}
      aria-pressed={linked}
      onClick={toggleLinked}
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
  );

  if (linked) {
    return (
      <UnitSlider<LengthUnit>
        label="Gap"
        value={c.gap}
        unit={c.gapUnit}
        units={LENGTH_UNITS}
        limits={LENGTH_LIMITS}
        action={linkButton}
        onChange={(gap, gapUnit) => onChange(linkedGapPatch(gap, gapUnit))}
      />
    );
  }

  return (
    <div className="space-y-2">
      <ControlLabel label="Gap">{linkButton}</ControlLabel>
      <div className="space-y-3 rounded-md border border-border bg-muted/30 p-2.5">
        <UnitSlider<LengthUnit>
          label="Column gap"
          value={c.columnGap}
          unit={c.gapUnit}
          units={LENGTH_UNITS}
          limits={LENGTH_LIMITS}
          onChange={(columnGap, gapUnit) =>
            onChange(unlinkedGapPatch('columnGap', columnGap, gapUnit))
          }
        />
        <UnitSlider<LengthUnit>
          label="Row gap"
          value={c.rowGap}
          unit={c.gapUnit}
          units={LENGTH_UNITS}
          limits={LENGTH_LIMITS}
          onChange={(rowGap, gapUnit) =>
            onChange(unlinkedGapPatch('rowGap', rowGap, gapUnit))
          }
        />
      </div>
    </div>
  );
}
