'use client';

import { ScrollArea } from '@/components/ui/scroll-area';
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
import {
  Description,
  ResponsiveChoose,
  SelectInput,
  UnitSlider,
} from './primitives';

const cap = (v: string) => v.charAt(0).toUpperCase() + v.slice(1);
const opts = <T extends string>(list: readonly T[]) =>
  list.map(value => ({ value, label: cap(value) }));

const FAMILY_OPTIONS = [
  { value: '', label: 'Default' },
  ...opts(FONT_FAMILIES),
];

const WEIGHT_OPTIONS = [
  { value: '', label: 'Default' },
  { value: '100', label: '100 (Thin)' },
  { value: '200', label: '200 (Extra Light)' },
  { value: '300', label: '300 (Light)' },
  { value: '400', label: '400 (Normal)' },
  { value: '500', label: '500 (Medium)' },
  { value: '600', label: '600 (Semi Bold)' },
  { value: '700', label: '700 (Bold)' },
  { value: '800', label: '800 (Extra Bold)' },
  { value: '900', label: '900 (Black)' },
];

export type TypographyControlProps = {
  value: Typography | undefined;
  onChange: (value: Typography | undefined) => void;
  exclude?: string[];
  defaultFamily?: string;
  defaultWeight?: string | number;
};

/** Elementor-style typography group. */
export function TypographyControl({
  value,
  onChange,
  exclude,
  defaultFamily,
  defaultWeight,
}: TypographyControlProps) {
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

  const isExcluded = (field: string) => exclude?.includes(field);

  // Normalize weight value for display
  const resolvedWeight =
    t.fontWeight !== undefined
      ? t.fontWeight
      : t.weight !== undefined
        ? t.weight
        : defaultWeight;

  const currentWeight =
    resolvedWeight !== undefined
      ? typeof resolvedWeight === 'number'
        ? String(resolvedWeight)
        : typeof resolvedWeight === 'string'
          ? resolvedWeight === 'regular'
            ? '400'
            : resolvedWeight === 'medium'
              ? '500'
              : resolvedWeight === 'bold'
                ? '700'
                : resolvedWeight
          : (resolvedWeight as any)?.desktop
            ? String((resolvedWeight as any).desktop)
            : ''
      : '';
  return (
    <ScrollArea className="max-h-96">
      <div className="space-y-4 pr-3">
        {!isExcluded('family') && (
          <SelectInput
            label="Family"
            value={t.family ?? defaultFamily ?? ''}
            options={FAMILY_OPTIONS}
            onChange={family =>
              set({ family: (family || undefined) as Typography['family'] })
            }
          />
        )}

        {!isExcluded('fontSize') && (
          <>
            {!isExcluded('size') && (
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
            )}

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
              onChange={(fontSize, fontSizeUnit) =>
                set({ fontSize, fontSizeUnit })
              }
            />
            <Description>Overrides the Base size preset when set.</Description>
          </>
        )}

        {!isExcluded('weight') && (
          <SelectInput
            label="Weight"
            value={currentWeight}
            options={WEIGHT_OPTIONS}
            onChange={weight => {
              const num = weight ? parseInt(weight, 10) : undefined;
              set({ weight: num ?? (weight as any), fontWeight: num });
            }}
          />
        )}

        {!isExcluded('transform') && (
          <SelectInput
            label="Transform"
            value={t.transform ?? 'none'}
            options={opts(TEXT_TRANSFORMS)}
            onChange={transform => set({ transform })}
          />
        )}

        {!isExcluded('fontStyle') && (
          <SelectInput
            label="Style"
            value={t.fontStyle ?? 'normal'}
            options={opts(FONT_STYLES)}
            onChange={fontStyle => set({ fontStyle })}
          />
        )}

        {!isExcluded('decoration') && (
          <SelectInput
            label="Decoration"
            value={t.decoration ?? 'none'}
            options={opts(TEXT_DECORATIONS)}
            onChange={decoration => set({ decoration })}
          />
        )}

        {!isExcluded('lineHeight') && (
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
        )}

        {!isExcluded('letterSpacing') && (
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
        )}

        {!isExcluded('wordSpacing') && (
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
        )}
      </div>
    </ScrollArea>
  );
}
