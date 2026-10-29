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
import { useInspectorTab } from './inspector-tab';
import {
  Choose,
  ControlLabel,
  Description,
  Group,
  ResponsiveChoose,
  Slider,
  StateTabs,
  UnitSlider,
} from './primitives';
import { ShadowControl } from './shadow';
// import { TypographyControl } from './typography';


/** Blocks that wrap repeated children in `MotionItem`, so stagger and per-item hover apply. */
export const STAGGER_BLOCKS = [
  'Features',
  'Stats',
  'Pricing',
  'Testimonials',
  'FAQ',
  'Columns',
];

type Props = {
  value: SectionSettings | undefined;
  onChange: (value: SectionSettings) => void;
};

function StyleControls({
  value: s,
  set,
  blockType,
}: {
  value: SectionSettings;
  set: (patch: Partial<SectionSettings>) => void;
  blockType?: string;
}) {
  const hover = s.hover ?? {};

  return (
    <div>
      <Group title="Colors" defaultOpen>
        <Choose
          label="Background preset"
          value={s.background ?? 'default'}
          options={[
            { value: 'default', label: 'Page' },
            { value: 'muted', label: 'Muted' },
            { value: 'primary', label: 'Primary' },
            { value: 'dark', label: 'Dark' },
          ]}
          onChange={background => set({ background })}
        />
        <StateTabs
          normal={
            <div className="space-y-3">
              <BackgroundControl
                value={s.fill}
                onChange={fill => set({ fill })}
              />
              {/* <ColorPicker
                label="Text color"
                value={s.textColor}
                onChange={textColor => set({ textColor })}
              /> */}
            </div>
          }
          hover={
            <div className="space-y-3">
              <Description>Optional overrides applied on hover.</Description>
              <BackgroundControl
                value={hover.fill}
                onChange={fill => set({ hover: { ...hover, fill } })}
              />
              {/* <ColorPicker
                label="Text color"
                value={hover.textColor}
                onChange={textColor => set({ hover: { ...hover, textColor } })}
              /> */}
            </div>
          }
        />
      </Group>

      {/* <Group title="Typography">
        <TypographyControl
          value={s.typography}
          onChange={typography => set({ typography })}
        />
      </Group> */}

      <Group title="Border">
        <StateTabs
          normal={
            <div className="space-y-3">
              <BorderControl
                value={s.border}
                onChange={border => set({ border })}
              />
              <ShadowControl
                value={s.shadow}
                onChange={shadow => set({ shadow })}
              />
            </div>
          }
          hover={
            <div className="space-y-3">
              <Description>Optional border and shadow on hover.</Description>
              <ColorPicker
                label="Border color"
                value={hover.borderColor}
                onChange={borderColor =>
                  set({ hover: { ...hover, borderColor } })
                }
              />
              <ShadowControl
                value={hover.shadow}
                onChange={shadow => set({ hover: { ...hover, shadow } })}
              />
            </div>
          }
        />
      </Group>

      <Group title="Filters">
        <FilterControl value={s.filter} onChange={filter => set({ filter })} />
      </Group>

      <Group title="Display">
        <ResponsiveChoose
          label="Minimum height"
          value={s.display?.minHeight}
          options={[
            { value: 'auto', label: 'Auto' },
            { value: 'half', label: 'Half screen' },
            { value: 'screen', label: 'Full screen' },
          ]}
          onChange={minHeight =>
            set({
              display: { ...s.display, minHeight: minHeight || undefined },
            })
          }
        />
        <ResponsiveChoose
          label="Content position"
          value={s.display?.contentAlign}
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
            set({
              display: {
                ...s.display,
                contentAlign: contentAlign || undefined,
              },
            })
          }
        />
      </Group>

      <Group title="Animation">
        <AnimationControl
          value={s.animation}
          supportsStagger={!!blockType && STAGGER_BLOCKS.includes(blockType)}
          onChange={animation => set({ animation })}
        />
      </Group>
    </div>
  );
}

function LayoutControls({
  value: s,
  set,
  blockType,
}: {
  value: SectionSettings;
  set: (patch: Partial<SectionSettings>) => void;
  blockType?: string;
}) {
  const anchorId = useId();
  const shown: Record<Device, boolean> = {
    desktop: !s.hideOnDesktop,
    tablet: !s.hideOnTablet,
    mobile: !s.hideOnMobile,
  };

  const widthUnits = PROP_UNITS.width as readonly LengthUnit[];
  const widthLimits = Object.fromEntries(
    widthUnits.map(u => [u, LENGTH_LIMITS[u]])
  ) as Record<LengthUnit, { min: number; max: number; step: number }>;

  return (
    <div>
      <Group title="Spacing">
        <Choose
          label="Vertical padding preset"
          value={s.paddingY ?? 'md'}
          options={[
            { value: 'none', label: 'None' },
            { value: 'sm', label: 'S' },
            { value: 'md', label: 'M' },
            { value: 'lg', label: 'L' },
          ]}
          onChange={paddingY => set({ paddingY })}
        />
        <Dimensions
          label="Custom padding"
          value={s.spacing}
          unit={s.spacingUnit ?? 'px'}
          onUnitChange={spacingUnit =>
            set({ spacingUnit: spacingUnit as SpacingUnit })
          }
          onChange={spacing => set({ spacing })}
        />
        <Dimensions
          label="Margin"
          value={s.margin}
          unit={s.marginUnit ?? 'px'}
          max={SPACING_LIMITS[s.marginUnit ?? 'px'].max}
          onUnitChange={marginUnit =>
            set({ marginUnit: marginUnit as SpacingUnit })
          }
          onChange={margin => set({ margin })}
        />
      </Group>

      {blockType !== 'Container' && (
        <Group title="Size">
          <UnitSlider
            label="Width"
            value={s.width}
            unit={s.widthUnit}
            units={widthUnits}
            limits={widthLimits}
            onChange={(width, widthUnit) => set({ width, widthUnit })}
          />
          <Slider
            label="Z-index"
            value={s.zIndex}
            min={0}
            max={50}
            step={1}
            placeholder="0"
            onChange={zIndex => set({ zIndex })}
          />
        </Group>
      )}

      <Group title="Alignment">
        <ResponsiveChoose
          label="Text alignment"
          value={s.align}
          options={[
            { value: '', label: 'Block default', icon: <Ban /> },
            { value: 'left', label: 'Left', icon: <AlignLeft /> },
            { value: 'center', label: 'Center', icon: <AlignCenter /> },
            { value: 'right', label: 'Right', icon: <AlignRight /> },
          ]}
          onChange={align => set({ align: align || undefined })}
        />
      </Group>

      <Group title="Visibility">
        <div>
          <ControlLabel label="Show on" />
          <DeviceToggles
            value={shown}
            onChange={next =>
              set({
                hideOnDesktop: !next.desktop,
                hideOnTablet: !next.tablet,
                hideOnMobile: !next.mobile,
              })
            }
          />
        </div>
      </Group>

      <Group title="Anchor">
        <div>
          <ControlLabel label="Anchor id (for #links)" htmlFor={anchorId} />
          <input
            id={anchorId}
            value={s.anchor ?? ''}
            placeholder="pricing"
            onChange={e =>
              set({ anchor: e.target.value.replace(/[^a-zA-Z0-9_-]/g, '-') })
            }
            className="h-8 w-full rounded-md border border-steel-200 bg-white px-2 text-xs"
          />
        </div>
      </Group>
    </div>
  );
}

/**
 * The `section` field on every block. Inside the floating card it shows the Style or Layout tab;
 * anywhere else (such as Puck's default sidebar) it shows both.
 */
export function SectionField({ value, onChange }: Props) {
  const tab = useInspectorTab();
  const blockType = useEditorBridge().selectedType;
  const s = value ?? {};
  const set = (patch: Partial<SectionSettings>) => onChange({ ...s, ...patch });

  if (tab === 'style')
    return <StyleControls value={s} set={set} blockType={blockType} />;
  if (tab === 'layout')
    return <LayoutControls value={s} set={set} blockType={blockType} />;

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-steel-400">
        Style
      </p>
      <StyleControls value={s} set={set} blockType={blockType} />
      <p className="pt-2 text-xs font-semibold uppercase tracking-wide text-steel-400">
        Layout
      </p>
      <LayoutControls value={s} set={set} blockType={blockType} />
    </div>
  );
}
