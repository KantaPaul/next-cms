'use client';

import { useId } from 'react';
import type { ElementHoverStyle, ElementStyle, Fill, ShadowSettings } from '../style';
import { BackgroundControl } from './background';
import { BorderControl } from './border';
import { ColorPicker } from './color-picker';
import { Dimensions } from './dimensions';
import { ControlLabel, StateTabs } from './primitives';
import { ShadowControl } from './shadow';
import { TypographyControl } from './typography';

export type ElementPart =
  | 'color'
  | 'typography'
  | 'textShadow'
  | 'background'
  | 'border'
  | 'shadow'
  | 'padding'
  | 'margin';

export type ElementStyleControlProps = {
  parts: readonly ElementPart[];
  value: ElementStyle | undefined;
  onChange: (value: ElementStyle) => void;
};

export function ElementStyleControl({
  parts,
  value,
  onChange,
}: ElementStyleControlProps) {
  const textColorId = useId();
  const hoverColorId = useId();
  const es = value ?? {};
  const set = (patch: Partial<ElementStyle>) => onChange({ ...es, ...patch });
  const setHover = (hoverPatch: Partial<ElementHoverStyle>) =>
    onChange({
      ...es,
      hover: {
        ...(es.hover ?? {}),
        ...hoverPatch,
      },
    });

  const hasColor = parts.includes('color');
  const hasTypography = parts.includes('typography');
  const hasBg = parts.includes('background');
  const hasBorder = parts.includes('border');
  const hasShadow = parts.includes('shadow');
  const hasPadding = parts.includes('padding');
  const hasMargin = parts.includes('margin');

  const normalPane = (
    <div className="space-y-4">
      {hasColor && (
        <div>
          <ControlLabel label="Text color" htmlFor={textColorId} />
          <ColorPicker
            id={textColorId}
            value={es.color ?? ''}
            onChange={color => set({ color: color || undefined })}
          />
        </div>
      )}

      {hasTypography && (
        <TypographyControl
          value={es.typography}
          onChange={typography => set({ typography })}
        />
      )}

      {hasBg && (
        <BackgroundControl
          value={
            typeof es.fill === 'string'
              ? { type: 'color', color: es.fill }
              : (es.fill as Fill | undefined)
          }
          onChange={fill => set({ fill })}
        />
      )}

      {hasBorder && (
        <BorderControl
          value={es.border}
          onChange={border => set({ border })}
        />
      )}

      {hasShadow && (
        <ShadowControl
          value={typeof es.shadow === 'object' ? es.shadow : undefined}
          onChange={shadow => set({ shadow })}
        />
      )}

      {hasPadding && (
        <Dimensions
          label="Padding"
          value={es.padding}
          unit={es.paddingUnit ?? 'px'}
          onChange={(padding, paddingUnit) => set({ padding, paddingUnit })}
        />
      )}

      {hasMargin && (
        <Dimensions
          label="Margin"
          value={es.margin}
          unit={es.marginUnit ?? 'px'}
          onChange={(margin, marginUnit) => set({ margin, marginUnit })}
        />
      )}
    </div>
  );

  const hoverPane = (
    <div className="space-y-4">
      {hasColor && (
        <div>
          <ControlLabel label="Hover text color" htmlFor={hoverColorId} />
          <ColorPicker
            id={hoverColorId}
            value={es.hover?.color ?? ''}
            onChange={color => setHover({ color: color || undefined })}
          />
        </div>
      )}

      {hasBg && (
        <BackgroundControl
          value={
            typeof es.hover?.fill === 'string'
              ? { type: 'color', color: es.hover.fill }
              : (es.hover?.fill as Fill | undefined)
          }
          onChange={fill => setHover({ fill })}
        />
      )}

      {hasBorder && (
        <div>
          <ControlLabel label="Hover border color" />
          <ColorPicker
            value={es.hover?.borderColor ?? ''}
            onChange={borderColor => setHover({ borderColor: borderColor || undefined })}
          />
        </div>
      )}

      {hasShadow && (
        <ShadowControl
          value={es.hover?.shadow}
          onChange={shadow => setHover({ shadow })}
        />
      )}
    </div>
  );

  // If only static layout properties (e.g. typography or padding without color/border/bg/shadow),
  // render normal pane directly without hover tabs.
  const supportsHover = hasColor || hasBg || hasBorder || hasShadow;

  if (!supportsHover) {
    return normalPane;
  }

  return <StateTabs normal={normalPane} hover={hoverPane} />;
}
