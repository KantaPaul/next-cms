'use client';

import {
  FONT_FAMILIES,
  FONT_STYLES,
  LENGTH_LIMITS,
  type LengthUnit,
  PROP_UNITS,
  SIGNED_LENGTH_LIMITS,
  TEXT_DECORATIONS,
  TEXT_TRANSFORMS,
  type Typography,
} from '../style';
import { ColorPicker } from './color-picker';
import {
  Description,
  Divider,
  PanelHeading,
  ResponsiveChoose,
  SelectInput,
  Slider,
  UnitSlider,
} from './primitives';

const cap = (v: string) => v.charAt(0).toUpperCase() + v.slice(1);
const opts = <T extends string>(list: readonly T[]) =>
  list.map(value => ({ value, label: cap(value) }));

type Props = {
  value: Typography | undefined;
  onChange: (value: Typography | undefined) => void;
};

/** Elementor-style typography group. Legacy `size` / `weight` presets remain and are overridden by the unit size. */
export function TypographyControl({ value, onChange }: Props) {
  const t = value ?? {};
  const set = (patch: Partial<Typography>) => {
    const next: Typography = { ...t, ...patch };
    for (const k of Object.keys(next) as (keyof Typography)[])
      if (next[k] === undefined || next[k] === '') delete next[k];
    onChange(Object.keys(next).length ? next : undefined);
  };
  const unitLimits = (units: readonly LengthUnit[], signed = false) =>
    Object.fromEntries(
      units.map(u => [u, (signed ? SIGNED_LENGTH_LIMITS : LENGTH_LIMITS)[u]])
    ) as Record<LengthUnit, { min: number; max: number; step: number }>;
  const fsUnits = PROP_UNITS.fontSize as readonly LengthUnit[];
  const lhUnits = PROP_UNITS.lineHeight as readonly LengthUnit[];
  const lsUnits = PROP_UNITS.letterSpacing as readonly LengthUnit[];
  const wsUnits = PROP_UNITS.wordSpacing as readonly LengthUnit[];
  const shadow = t.textShadow ?? {};
  const stroke = t.textStroke ?? {};

  return (
    <div className="space-y-4">
      <SelectInput
        label="Family"
        value={t.family ?? ''}
        options={[
          { value: '' as never, label: 'Default' },
          ...opts(FONT_FAMILIES),
        ]}
        onChange={family =>
          set({ family: (family || undefined) as Typography['family'] })
        }
      />
      <UnitSlider
        label="Size"
        value={t.fontSize}
        unit={t.fontSizeUnit}
        units={fsUnits}
        limits={{
          ...unitLimits(fsUnits),
          px: { min: 8, max: 160, step: 1 },
          rem: { min: 0.5, max: 10, step: 0.05 },
          em: { min: 0.5, max: 10, step: 0.05 },
          vw: { min: 1, max: 20, step: 0.1 },
        }}
        onChange={(fontSize, fontSizeUnit) => set({ fontSize, fontSizeUnit })}
      />
      <Description>Overrides the Base size preset when set.</Description>
      <ResponsiveChoose
        label="Base size (preset)"
        value={t.size}
        options={[
          { value: '', label: 'Auto' },
          { value: 'sm', label: 'S' },
          { value: 'md', label: 'M' },
          { value: 'lg', label: 'L' },
          { value: 'xl', label: 'XL' },
        ]}
        onChange={size => set({ size: size || undefined })}
      />
      <ResponsiveChoose
        label="Weight"
        value={t.weight}
        options={[
          { value: '', label: 'Auto' },
          { value: 'regular', label: 'Regular' },
          { value: 'medium', label: 'Medium' },
          { value: 'bold', label: 'Bold' },
        ]}
        onChange={weight => set({ weight: weight || undefined })}
      />
      <SelectInput
        label="Transform"
        value={t.transform ?? 'none'}
        options={opts(TEXT_TRANSFORMS)}
        onChange={transform => set({ transform })}
      />
      <SelectInput
        label="Style"
        value={t.fontStyle ?? 'normal'}
        options={opts(FONT_STYLES)}
        onChange={fontStyle => set({ fontStyle })}
      />
      <SelectInput
        label="Decoration"
        value={t.decoration ?? 'none'}
        options={opts(TEXT_DECORATIONS)}
        onChange={decoration => set({ decoration })}
      />
      <UnitSlider
        label="Line height"
        value={t.lineHeight}
        unit={t.lineHeightUnit}
        units={lhUnits}
        limits={unitLimits(lhUnits)}
        onChange={(lineHeight, lineHeightUnit) =>
          set({ lineHeight, lineHeightUnit })
        }
      />
      <UnitSlider
        label="Letter spacing"
        value={t.letterSpacing}
        unit={t.letterSpacingUnit}
        units={lsUnits}
        limits={unitLimits(lsUnits, true)}
        onChange={(letterSpacing, letterSpacingUnit) =>
          set({ letterSpacing, letterSpacingUnit })
        }
      />
      <UnitSlider
        label="Word spacing"
        value={t.wordSpacing}
        unit={t.wordSpacingUnit}
        units={wsUnits}
        limits={unitLimits(wsUnits, true)}
        onChange={(wordSpacing, wordSpacingUnit) =>
          set({ wordSpacing, wordSpacingUnit })
        }
      />

      <Divider />
      <PanelHeading>Text shadow</PanelHeading>
      <Slider
        label="X"
        value={shadow.x}
        min={-50}
        max={50}
        unit="px"
        onChange={x => set({ textShadow: { ...shadow, x } })}
      />
      <Slider
        label="Y"
        value={shadow.y}
        min={-50}
        max={50}
        unit="px"
        onChange={y => set({ textShadow: { ...shadow, y } })}
      />
      <Slider
        label="Blur"
        value={shadow.blur}
        min={0}
        max={100}
        unit="px"
        onChange={blur => set({ textShadow: { ...shadow, blur } })}
      />
      <ColorPicker
        label="Shadow color"
        value={shadow.color}
        onChange={color => set({ textShadow: { ...shadow, color } })}
      />
      {t.textShadow && (
        <button
          type="button"
          onClick={() => set({ textShadow: undefined })}
          className="text-[11px] text-indigo-600"
        >
          Remove text shadow
        </button>
      )}

      <Divider />
      <PanelHeading>Text stroke</PanelHeading>
      <Slider
        label="Width"
        value={stroke.width}
        min={0}
        max={10}
        unit="px"
        onChange={width => set({ textStroke: { ...stroke, width } })}
      />
      <ColorPicker
        label="Stroke color"
        value={stroke.color}
        onChange={color => set({ textStroke: { ...stroke, color } })}
      />
    </div>
  );
}
