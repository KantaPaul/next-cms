'use client';

import {
  OVERLAY_HEIGHT_LIMITS,
  OVERLAY_HEIGHT_UNITS,
  OVERLAY_RADIUS_UNITS,
  OVERLAY_WIDTH_LIMITS,
  OVERLAY_WIDTH_UNITS,
  type OverlayCategory,
  readOverlayLayout,
} from '@/lib/overlays/layout-style';
import { LENGTH_LIMITS, type LengthUnit } from '../style';
import { ColorPicker } from './color-picker';
import { Dimensions } from './dimensions';
import { Slider, UnitSlider } from './primitives';

/**
 * Popup/Drawer "Layout" fields, built from the global style controls. Each field
 * saves its value and unit under one key, so resetting a row only touches that row.
 * Values go through `readOverlayLayout` so older saves show correctly.
 */
type OverlayFieldProps = {
  value: unknown;
  onChange: (value: unknown) => void;
  field: { label?: string; overlayCategory?: OverlayCategory };
};

const read = (key: string, { value, field }: OverlayFieldProps) =>
  readOverlayLayout({ [key]: value }, field.overlayCategory ?? 'Popup');

const radiusLimits = Object.fromEntries(
  OVERLAY_RADIUS_UNITS.map(unit => [unit, LENGTH_LIMITS[unit]])
) as Record<LengthUnit, { min: number; max: number; step: number }>;

export function OverlayBackgroundField(props: OverlayFieldProps) {
  return (
    <ColorPicker
      label={props.field.label}
      value={read('background', props).background}
      onChange={props.onChange}
    />
  );
}

export function OverlayBackdropField(props: OverlayFieldProps) {
  const backdrop = read('overlayColor', props).overlayColor;
  const color = backdrop?.color;
  const opacity = backdrop?.opacity ?? 100;
  return (
    <div className="space-y-3">
      <ColorPicker
        label={props.field.label}
        value={color}
        onChange={next =>
          props.onChange(next ? { color: next, opacity } : undefined)
        }
      />
      <Slider
        label="Backdrop opacity"
        value={opacity}
        min={0}
        max={100}
        unit="%"
        onChange={next =>
          props.onChange({ color, opacity: next ?? opacity })
        }
      />
    </div>
  );
}

export function OverlayWidthField(props: OverlayFieldProps) {
  const width = read('width', props).width;
  return (
    <UnitSlider
      label={props.field.label ?? 'Width'}
      value={width?.value}
      unit={width?.unit as (typeof OVERLAY_WIDTH_UNITS)[number] | undefined}
      units={OVERLAY_WIDTH_UNITS}
      limits={OVERLAY_WIDTH_LIMITS}
      onChange={(value, unit) => props.onChange({ value, unit })}
    />
  );
}

export function OverlayHeightField(props: OverlayFieldProps) {
  const maxHeight = read('maxHeight', props).maxHeight;
  return (
    <UnitSlider
      label={props.field.label ?? 'Max height'}
      value={maxHeight?.value}
      unit={maxHeight?.unit as (typeof OVERLAY_HEIGHT_UNITS)[number] | undefined}
      units={OVERLAY_HEIGHT_UNITS}
      limits={OVERLAY_HEIGHT_LIMITS}
      onChange={(value, unit) => props.onChange({ value, unit })}
    />
  );
}

export function OverlayPaddingField(props: OverlayFieldProps) {
  const padding = read('padding', props).padding;
  return (
    <Dimensions
      label={props.field.label ?? 'Padding'}
      value={padding?.value}
      unit={padding?.unit ?? 'px'}
      onUnitChange={unit => props.onChange({ value: padding?.value, unit })}
      onChange={value => props.onChange({ value, unit: padding?.unit ?? 'px' })}
    />
  );
}

export function OverlayRadiusField(props: OverlayFieldProps) {
  const radius = read('radius', props).radius;
  return (
    <UnitSlider
      label={props.field.label ?? 'Corner radius'}
      value={radius?.value}
      unit={radius?.unit}
      units={OVERLAY_RADIUS_UNITS}
      limits={radiusLimits}
      onChange={(value, unit) => props.onChange({ value, unit })}
    />
  );
}
