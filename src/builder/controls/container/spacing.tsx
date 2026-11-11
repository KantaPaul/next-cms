'use client';

import {
  type SectionSettings,
  SPACING_LIMITS,
  type SpacingUnit,
} from '../../style';
import { Dimensions } from '../dimensions';
import { Choose } from '../primitives';

export function ContainerSpacingControl({
  value,
  onChange,
}: {
  value: SectionSettings | undefined;
  onChange: (value: Partial<SectionSettings>) => void;
}) {
  const s = value ?? {};

  return (
    <div className="space-y-3.5">
      <Choose
        label="Vertical padding preset"
        value={s.paddingY ?? 'md'}
        options={[
          { value: 'none', label: 'None' },
          { value: 'sm', label: 'S' },
          { value: 'md', label: 'M' },
          { value: 'lg', label: 'L' },
        ]}
        onChange={paddingY => onChange({ ...s, paddingY })}
      />
      <Dimensions
        label="Custom padding"
        value={s.spacing}
        unit={s.spacingUnit ?? 'px'}
        onUnitChange={spacingUnit =>
          onChange({ ...s, spacingUnit: spacingUnit as SpacingUnit })
        }
        onChange={spacing => onChange({ ...s, spacing })}
      />
      <Dimensions
        label="Margin"
        value={s.margin}
        unit={s.marginUnit ?? 'px'}
        max={SPACING_LIMITS[s.marginUnit ?? 'px'].max}
        onUnitChange={marginUnit =>
          onChange({ ...s, marginUnit: marginUnit as SpacingUnit })
        }
        onChange={margin => onChange({ ...s, margin })}
      />
    </div>
  );
}
