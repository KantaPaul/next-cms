'use client';

import { createUsePuck } from '@measured/puck';
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
import type { Device, SectionSettings } from '../style';
import { AnimationControl } from './animation';
import { BackgroundControl } from './background';
import { BorderControl } from './border';
import { ColorPicker } from './color-picker';
import { DeviceToggles } from './device-row';
import { Dimensions } from './dimensions';
import { useInspectorTab } from './inspector-tab';
import { Choose, ControlLabel, Group, ResponsiveChoose } from './primitives';
import { ShadowControl } from './shadow';

const usePuck = createUsePuck();

/** Blocks that wrap repeated children in `MotionItem`, so stagger and per-item hover apply. */
export const STAGGER_BLOCKS = ['Features', 'Stats', 'Pricing', 'Testimonials', 'FAQ', 'Columns'];

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
        <BackgroundControl value={s.fill} onChange={fill => set({ fill })} />
        <ColorPicker
          label="Text color"
          value={s.textColor}
          onChange={textColor => set({ textColor })}
        />
      </Group>

      <Group title="Typography">
        <ResponsiveChoose
          label="Base size"
          value={s.typography?.size}
          options={[
            { value: '', label: 'Auto' },
            { value: 'sm', label: 'S' },
            { value: 'md', label: 'M' },
            { value: 'lg', label: 'L' },
            { value: 'xl', label: 'XL' },
          ]}
          onChange={size => set({ typography: { ...s.typography, size: size || undefined } })}
        />
        <ResponsiveChoose
          label="Weight"
          value={s.typography?.weight}
          options={[
            { value: '', label: 'Auto' },
            { value: 'regular', label: 'Regular' },
            { value: 'medium', label: 'Medium' },
            { value: 'bold', label: 'Bold' },
          ]}
          onChange={weight =>
            set({ typography: { ...s.typography, weight: weight || undefined } })
          }
        />
      </Group>

      <Group title="Border">
        <BorderControl value={s.border} onChange={border => set({ border })} />
        <ShadowControl value={s.shadow} onChange={shadow => set({ shadow })} />
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
            set({ display: { ...s.display, minHeight: minHeight || undefined } })
          }
        />
        <ResponsiveChoose
          label="Content position"
          value={s.display?.contentAlign}
          options={[
            { value: 'start', label: 'Top', icon: <AlignVerticalJustifyStart /> },
            { value: 'center', label: 'Middle', icon: <AlignVerticalJustifyCenter /> },
            { value: 'end', label: 'Bottom', icon: <AlignVerticalJustifyEnd /> },
          ]}
          onChange={contentAlign =>
            set({ display: { ...s.display, contentAlign: contentAlign || undefined } })
          }
        />
      </Group>

      <Group title="Animation" defaultOpen>
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
}: {
  value: SectionSettings;
  set: (patch: Partial<SectionSettings>) => void;
}) {
  const anchorId = useId();
  const shown: Record<Device, boolean> = {
    desktop: !s.hideOnDesktop,
    tablet: !s.hideOnTablet,
    mobile: !s.hideOnMobile,
  };

  return (
    <div>
      <Group title="Spacing" defaultOpen>
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
          onUnitChange={spacingUnit => set({ spacingUnit })}
          onChange={spacing => set({ spacing })}
        />
      </Group>

      <Group title="Alignment" defaultOpen>
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
            onChange={e => set({ anchor: e.target.value.replace(/[^a-zA-Z0-9_-]/g, '-') })}
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
  const blockType = usePuck(s => s.selectedItem?.type as string | undefined);
  const s = value ?? {};
  const set = (patch: Partial<SectionSettings>) => onChange({ ...s, ...patch });

  if (tab === 'style') return <StyleControls value={s} set={set} blockType={blockType} />;
  if (tab === 'layout') return <LayoutControls value={s} set={set} />;

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold tracking-wide text-steel-400 uppercase">Style</p>
      <StyleControls value={s} set={set} blockType={blockType} />
      <p className="pt-2 text-xs font-semibold tracking-wide text-steel-400 uppercase">Layout</p>
      <LayoutControls value={s} set={set} />
    </div>
  );
}
