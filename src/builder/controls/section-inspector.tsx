'use client';

import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd,
  AlignVerticalJustifyStart,
  Ban,
} from 'lucide-react';
import { useId } from 'react';
import {
  type Device,
  LENGTH_LIMITS,
  type LengthUnit,
  PROP_UNITS,
  type SectionSettings,
  SPACING_LIMITS,
  type SpacingUnit,
} from '../style';
import { useEditorBridge } from './editor-bridge';
import { AnimationControl } from './animation';
import { BackgroundControl } from './background';
import { BorderControl } from './border';
import { ColorPicker } from './color-picker';
import { DeviceToggles } from './device-row';
import { Dimensions } from './dimensions';
import { FilterControl } from './filter';
import { GroupShell } from './groups/shell';
import {
  Choose,
  ControlLabel,
  Description,
  ResponsiveChoose,
  Slider,
  StateTabs,
  UnitSlider,
} from './primitives';
import { ShadowControl } from './shadow';
import { TypographyControl } from './typography';

/** Blocks that wrap repeated children in `MotionItem`, so stagger and per-item hover apply. */
export const STAGGER_BLOCKS = [
  'Features',
  'Stats',
  'Pricing',
  'Testimonials',
  'FAQ',
  'Columns',
];

export function BackgroundSectionControl({
  value,
  onChange,
}: {
  value: SectionSettings | undefined;
  onChange: (value: Partial<SectionSettings>) => void;
}) {
  const s = value ?? {};
  const hover = s.hover ?? {};

  return (
    <div className="space-y-3">
      <Choose
        label="Background preset"
        value={s.background ?? 'default'}
        options={[
          { value: 'default', label: 'Page' },
          { value: 'muted', label: 'Muted' },
          { value: 'primary', label: 'Primary' },
          { value: 'dark', label: 'Dark' },
        ]}
        onChange={background => onChange({ ...s, background })}
      />
      <StateTabs
        normal={
          <div className="space-y-3">
            <GroupShell
              label="Background"
              value={s.fill}
              onChange={fill => onChange({ ...s, fill })}
            >
              {({ value: val, onChange: onValChange }) => (
                <BackgroundControl value={val} onChange={onValChange} />
              )}
            </GroupShell>
          </div>
        }
        hover={
          <div className="space-y-3">
            <Description>Optional overrides applied on hover.</Description>
            <GroupShell
              label="Background"
              value={hover.fill}
              onChange={fill => onChange({ ...s, hover: { ...hover, fill } })}
            >
              {({ value: val, onChange: onValChange }) => (
                <BackgroundControl value={val} onChange={onValChange} />
              )}
            </GroupShell>
          </div>
        }
      />
    </div>
  );
}

export function BorderSectionControl({
  value,
  onChange,
}: {
  value: SectionSettings | undefined;
  onChange: (value: Partial<SectionSettings>) => void;
}) {
  const s = value ?? {};
  const hover = s.hover ?? {};

  return (
    <div className="space-y-3">
      <StateTabs
        normal={
          <div className="space-y-3">
            <GroupShell
              label="Border"
              value={s.border}
              onChange={border => onChange({ ...s, border })}
            >
              {({ value: val, onChange: onValChange }) => (
                <BorderControl value={val} onChange={onValChange} />
              )}
            </GroupShell>
            <GroupShell
              label="Box Shadow"
              popover
              value={s.shadow}
              onChange={shadow => onChange({ ...s, shadow })}
            >
              {({ value: val, onChange: onValChange }) => (
                <ShadowControl value={val} onChange={onValChange} />
              )}
            </GroupShell>
          </div>
        }
        hover={
          <div className="space-y-3">
            <Description>Optional border and shadow on hover.</Description>
            <ColorPicker
              label="Border color"
              value={hover.borderColor}
              onChange={borderColor =>
                onChange({ ...s, hover: { ...hover, borderColor } })
              }
            />
            <GroupShell
              label="Box Shadow"
              popover
              value={hover.shadow}
              onChange={shadow => onChange({ ...s, hover: { ...hover, shadow } })}
            >
              {({ value: val, onChange: onValChange }) => (
                <ShadowControl value={val} onChange={onValChange} />
              )}
            </GroupShell>
          </div>
        }
      />
    </div>
  );
}

export function TypographySectionControl({
  value,
  onChange,
}: {
  value: SectionSettings | undefined;
  onChange: (value: Partial<SectionSettings>) => void;
}) {
  const s = value ?? {};

  return (
    <div className="space-y-3">
      <GroupShell
        label="Typography"
        popover
        value={s.typography}
        onChange={typography => onChange({ ...s, typography })}
      >
        {({ value: val, onChange: onValChange }) => (
          <TypographyControl value={val} onChange={onValChange} />
        )}
      </GroupShell>
      <ColorPicker
        label="Text color"
        value={s.textColor}
        onChange={textColor => onChange({ ...s, textColor })}
      />
    </div>
  );
}

export function FilterSectionControl({
  value,
  onChange,
}: {
  value: any;
  onChange: (value: any) => void;
}) {
  const filterVal =
    value && typeof value === 'object' && 'filter' in value ? value.filter : value;
  const isSection = value && typeof value === 'object' && 'filter' in value;

  return (
    <GroupShell
      label="CSS Filters"
      popover
      value={filterVal}
      onChange={filter => {
        if (isSection) onChange({ ...value, filter });
        else onChange(filter);
      }}
    >
      {({ value: val, onChange: onValChange }) => (
        <FilterControl value={val} onChange={onValChange} />
      )}
    </GroupShell>
  );
}

export function DisplaySectionControl({
  value,
  onChange,
}: {
  value: any;
  onChange: (value: any) => void;
}) {
  const display =
    value && typeof value === 'object' && 'display' in value ? value.display : value;
  const isSection = value && typeof value === 'object' && 'display' in value;

  const update = (patch: any) => {
    const next = { ...(display ?? {}), ...patch };
    if (isSection) onChange({ ...value, display: next });
    else onChange(next);
  };

  return (
    <div className="space-y-3">
      <ResponsiveChoose
        label="Minimum height"
        value={display?.minHeight}
        options={[
          { value: 'auto', label: 'Auto' },
          { value: 'half', label: 'Half screen' },
          { value: 'screen', label: 'Full screen' },
        ]}
        onChange={minHeight => update({ minHeight: minHeight || undefined })}
      />
      <ResponsiveChoose
        label="Content position"
        value={display?.contentAlign}
        options={[
          {
            value: 'start',
            label: 'Top',
            icon: <AlignVerticalJustifyStart />,
          },
          {
            value: 'center',
            label: 'Middle',
            icon: <AlignVerticalJustifyCenter />,
          },
          {
            value: 'end',
            label: 'Bottom',
            icon: <AlignVerticalJustifyEnd />,
          },
        ]}
        onChange={contentAlign =>
          update({ contentAlign: contentAlign || undefined })
        }
      />
    </div>
  );
}

export function LayoutSectionControl({
  value,
  onChange,
  omit,
}: {
  value: SectionSettings | undefined;
  onChange: (value: Partial<SectionSettings>) => void;
  omit?: string[];
}) {
  const s = value ?? {};
  const widthUnits = PROP_UNITS.width as readonly LengthUnit[];
  const widthLimits = Object.fromEntries(
    widthUnits.map(u => [u, LENGTH_LIMITS[u]])
  ) as Record<LengthUnit, { min: number; max: number; step: number }>;

  const omitWidth = omit?.includes('width');

  return (
    <div className="space-y-4">
      <div>
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

      {!omitWidth && (
        <div className="space-y-3 pt-2 border-t border-steel-100">
          <UnitSlider
            label="Width"
            value={s.width}
            unit={s.widthUnit}
            units={widthUnits}
            limits={widthLimits}
            onChange={(width, widthUnit) => onChange({ ...s, width, widthUnit })}
          />
          <Slider
            label="Z-index"
            value={s.zIndex}
            min={0}
            max={50}
            step={1}
            placeholder="0"
            onChange={zIndex => onChange({ ...s, zIndex })}
          />
        </div>
      )}

      <div className="pt-2 border-t border-steel-100">
        <ResponsiveChoose
          label="Text alignment"
          value={s.align}
          options={[
            { value: '', label: 'Block default', icon: <Ban /> },
            { value: 'left', label: 'Left', icon: <AlignLeft /> },
            { value: 'center', label: 'Center', icon: <AlignCenter /> },
            { value: 'right', label: 'Right', icon: <AlignRight /> },
          ]}
          onChange={align => onChange({ ...s, align: align || undefined })}
        />
      </div>
    </div>
  );
}

export function MotionSectionControl({
  value,
  onChange,
  blockType,
}: {
  value: any;
  onChange: (value: any) => void;
  blockType?: string;
}) {
  const anim =
    value && typeof value === 'object' && 'animation' in value
      ? value.animation
      : value;
  const isSection = value && typeof value === 'object' && 'animation' in value;

  return (
    <AnimationControl
      value={anim}
      supportsStagger={!!blockType && STAGGER_BLOCKS.includes(blockType)}
      onChange={animation => {
        if (isSection) onChange({ ...value, animation });
        else onChange(animation);
      }}
    />
  );
}

export function ResponsiveSectionControl({
  value,
  onChange,
}: {
  value: SectionSettings | undefined;
  onChange: (value: Partial<SectionSettings>) => void;
}) {
  const s = value ?? {};
  const shown: Record<Device, boolean> = {
    desktop: !s.hideOnDesktop,
    tablet: !s.hideOnTablet,
    mobile: !s.hideOnMobile,
  };

  return (
    <div>
      <ControlLabel label="Show on" />
      <DeviceToggles
        value={shown}
        onChange={next =>
          onChange({
            ...s,
            hideOnDesktop: !next.desktop,
            hideOnTablet: !next.tablet,
            hideOnMobile: !next.mobile,
          })
        }
      />
    </div>
  );
}

export function AttributesSectionControl({
  value,
  onChange,
}: {
  value: any;
  onChange: (value: any) => void;
}) {
  const anchorId = useId();
  const anchor = typeof value === 'string' ? value : value?.anchor ?? '';
  const isSection = value && typeof value === 'object' && 'anchor' in value;

  return (
    <div>
      <ControlLabel label="Anchor id (for #links)" htmlFor={anchorId} />
      <input
        id={anchorId}
        value={anchor}
        placeholder="pricing"
        onChange={e => {
          const val = e.target.value.replace(/[^a-zA-Z0-9_-]/g, '-');
          if (isSection) onChange({ ...value, anchor: val });
          else onChange(val);
        }}
        className="h-8 w-full rounded-md border border-steel-200 bg-white px-2 text-xs"
      />
    </div>
  );
}

type Props = {
  value: SectionSettings | undefined;
  onChange: (value: SectionSettings) => void;
};

/**
 * Deprecated wrapper for the global block editor and legacy contexts.
 */
export function SectionField({ value, onChange }: Props) {
  const blockType = useEditorBridge().selectedType;
  const s = value ?? {};
  const set = (patch: Partial<SectionSettings>) => onChange({ ...s, ...patch });

  return (
    <div className="space-y-4">
      <BackgroundSectionControl value={s} onChange={set} />
      <BorderSectionControl value={s} onChange={set} />
      <TypographySectionControl value={s} onChange={set} />
      <FilterSectionControl value={s.filter} onChange={filter => set({ filter })} />
      <DisplaySectionControl value={s.display} onChange={display => set({ display })} />
      <LayoutSectionControl
        value={s}
        onChange={set}
        omit={blockType === 'Container' ? ['width'] : undefined}
      />
      <MotionSectionControl
        value={s.animation}
        onChange={animation => set({ animation })}
        blockType={blockType}
      />
      <ResponsiveSectionControl value={s} onChange={set} />
      <AttributesSectionControl
        value={s.anchor}
        onChange={anchor => set({ anchor })}
      />
    </div>
  );
}
