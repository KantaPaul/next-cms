'use client';

import { Minus, MoreHorizontal, X } from 'lucide-react';
import {
  BORDER_STYLES,
  type BorderSettings,
  LENGTH_LIMITS,
  type LengthUnit,
  PROP_UNITS,
} from '../style';
import { ColorPicker } from './color-picker';
import { Dimensions } from './dimensions';
import { Choose, UnitSlider } from './primitives';

const STYLE_ICONS: Record<string, React.ReactNode> = {
  none: <X />,
  solid: <Minus />,
  dashed: <MoreHorizontal />,
  double: <span className="text-[10px] font-bold leading-none">=</span>,
  dotted: <span className="text-[10px] font-bold leading-none">···</span>,
  groove: <span className="text-[10px] font-bold leading-none">≡</span>,
};

const STYLES = (['none', ...BORDER_STYLES] as const).map(value => ({
  value,
  label: value.charAt(0).toUpperCase() + value.slice(1),
  icon: STYLE_ICONS[value],
}));

const RADIUS_UNITS = PROP_UNITS.radius as readonly LengthUnit[];
const radiusLimits = Object.fromEntries(
  RADIUS_UNITS.map(u => [u, LENGTH_LIMITS[u]])
) as Record<LengthUnit, { min: number; max: number; step: number }>;

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
        columns={3}
        onChange={next =>
          onChange(
            next === 'none'
              ? undefined
              : {
                  ...border,
                  style: next,
                  width: border.width ?? {
                    desktop: { top: 1, right: 1, bottom: 1, left: 1 },
                  },
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
      <UnitSlider
        label="Radius"
        value={border.radius}
        unit={border.radiusUnit}
        units={RADIUS_UNITS}
        limits={radiusLimits}
        onChange={(radius, radiusUnit) =>
          onChange({ ...border, radius, radiusUnit })
        }
      />
    </div>
  );
}
