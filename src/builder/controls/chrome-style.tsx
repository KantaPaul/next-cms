'use client';

import type { ChromeStyle, SpacingUnit, LengthUnit } from '../style';
import { BackgroundControl } from './background';
import { BorderControl } from './border';
import { ColorPicker } from './color-picker';
import { Dimensions } from './dimensions';
import { GroupShell } from './groups/shell';
import { Choose, Description, Group, UnitSlider } from './primitives';
import { ShadowControl } from './shadow';

export type ChromeStyleFieldProps = {
  value: ChromeStyle | undefined;
  onChange: (value: ChromeStyle) => void;
  kind?: 'header' | 'footer';
};

const MAX_WIDTH_UNITS = ['px', 'rem', '%', 'vw'] as const;
type MaxWidthUnit = (typeof MAX_WIDTH_UNITS)[number];
const MAX_WIDTH_LIMITS: Record<
  MaxWidthUnit,
  { min: number; max: number; step: number }
> = {
  px: { min: 320, max: 2400, step: 10 },
  rem: { min: 20, max: 150, step: 1 },
  '%': { min: 20, max: 100, step: 1 },
  vw: { min: 20, max: 100, step: 1 },
};

const MIN_HEIGHT_UNITS = ['px', 'rem', 'vh'] as const;
type MinHeightUnit = (typeof MIN_HEIGHT_UNITS)[number];
const MIN_HEIGHT_LIMITS: Record<
  MinHeightUnit,
  { min: number; max: number; step: number }
> = {
  px: { min: 0, max: 600, step: 5 },
  rem: { min: 0, max: 40, step: 0.5 },
  vh: { min: 0, max: 100, step: 1 },
};

export function ChromeStyleField({
  value,
  onChange,
  kind = 'header',
}: ChromeStyleFieldProps) {
  const s = value ?? {};
  const set = (patch: Partial<ChromeStyle>) => onChange({ ...s, ...patch });

  return (
    <div className="space-y-4">
      {/* Colors */}
      <Group title="Colors" defaultOpen>
        <Choose
          label="Background preset"
          value={s.background ?? 'default'}
          options={[
            { value: 'default', label: 'Default' },
            { value: 'muted', label: 'Surface / Muted' },
            { value: 'primary', label: 'Primary' },
            { value: 'dark', label: 'Dark' },
          ]}
          onChange={background => set({ background })}
        />
        <div className="space-y-3 pt-2">
          <GroupShell
            label="Background"
            value={s.fill}
            onChange={fill => set({ fill })}
            hideHeader
          >
            {({ value: val, onChange: onValChange }) => (
              <BackgroundControl value={val} onChange={onValChange} />
            )}
          </GroupShell>
          <ColorPicker
            label="Text color"
            value={s.textColor}
            onChange={textColor => set({ textColor })}
          />
          <ColorPicker
            label="Link color"
            value={s.linkColor}
            onChange={linkColor => set({ linkColor })}
          />
          <ColorPicker
            label="Link hover color"
            value={s.linkHoverColor}
            onChange={linkHoverColor => set({ linkHoverColor })}
          />
        </div>
      </Group>

      {/* Spacing */}
      <Group title="Spacing" defaultOpen>
        <Dimensions
          label="Padding"
          value={s.spacing}
          unit={s.spacingUnit ?? 'px'}
          onUnitChange={spacingUnit =>
            set({ spacingUnit: spacingUnit as SpacingUnit })
          }
          onChange={spacing => set({ spacing })}
        />
      </Group>

      {/* Size */}
      <Group title="Size">
        <Choose
          label="Content width"
          value={s.contentWidth ?? 'full'}
          options={[
            { value: 'full', label: 'Full width' },
            { value: 'boxed', label: 'Boxed' },
          ]}
          onChange={contentWidth => set({ contentWidth })}
        />
        {s.contentWidth === 'boxed' && (
          <UnitSlider<MaxWidthUnit>
            label="Maximum width"
            value={s.maxWidth}
            unit={(s.maxWidthUnit as MaxWidthUnit) ?? 'px'}
            units={MAX_WIDTH_UNITS}
            limits={MAX_WIDTH_LIMITS}
            onChange={(maxWidth, maxWidthUnit) =>
              set({ maxWidth, maxWidthUnit })
            }
          />
        )}
        <UnitSlider<MinHeightUnit>
          label="Minimum height"
          value={s.minHeight}
          unit={(s.minHeightUnit as MinHeightUnit) ?? 'px'}
          units={MIN_HEIGHT_UNITS}
          limits={MIN_HEIGHT_LIMITS}
          onChange={(minHeight, minHeightUnit) =>
            set({ minHeight, minHeightUnit })
          }
        />
      </Group>

      {/* Border */}
      <Group title="Border">
        <div className="space-y-3">
          <GroupShell
            label="Border"
            value={s.border}
            onChange={border => set({ border })}
          >
            {({ value: val, onChange: onValChange }) => (
              <BorderControl value={val} onChange={onValChange} />
            )}
          </GroupShell>
        </div>
      </Group>

      {/* Shadow */}
      <Group title="Shadow">
        <div className="space-y-3">
          <GroupShell
            label="Box Shadow"
            popover
            value={s.shadow}
            onChange={shadow => set({ shadow })}
          >
            {({ value: val, onChange: onValChange }) => (
              <ShadowControl value={val} onChange={onValChange} />
            )}
          </GroupShell>
        </div>
      </Group>

      {/* Scrolled State (Header only) */}
      {kind === 'header' && (
        <Group title="Scrolled state">
          <Description>
            Overrides applied when the header is sticky and scrolled.
          </Description>
          <div className="space-y-3 pt-2">
            <GroupShell
              label="Scrolled Background"
              value={s.scrolled?.fill}
              onChange={fill =>
                set({ scrolled: { ...s.scrolled, fill } })
              }
              hideHeader
            >
              {({ value: val, onChange: onValChange }) => (
                <BackgroundControl value={val} onChange={onValChange} />
              )}
            </GroupShell>
            <ColorPicker
              label="Text color"
              value={s.scrolled?.textColor}
              onChange={textColor =>
                set({ scrolled: { ...s.scrolled, textColor } })
              }
            />
            <ColorPicker
              label="Link color"
              value={s.scrolled?.linkColor}
              onChange={linkColor =>
                set({ scrolled: { ...s.scrolled, linkColor } })
              }
            />
          </div>
        </Group>
      )}

      {/* Transparent State (Header only) */}
      {kind === 'header' && (
        <Group title="Transparent state">
          <Description>
            Overrides applied when the header is transparent over hero content before scrolling.
          </Description>
          <div className="space-y-3 pt-2">
            <ColorPicker
              label="Text color"
              value={s.transparentTextColor}
              onChange={transparentTextColor => set({ transparentTextColor })}
            />
          </div>
        </Group>
      )}
    </div>
  );
}

export function HeaderStyleField(props: {
  value: ChromeStyle | undefined;
  onChange: (value: ChromeStyle) => void;
  [key: string]: unknown;
}) {
  return <ChromeStyleField {...props} kind="header" />;
}

export function FooterStyleField(props: {
  value: ChromeStyle | undefined;
  onChange: (value: ChromeStyle) => void;
  [key: string]: unknown;
}) {
  return <ChromeStyleField {...props} kind="footer" />;
}
