'use client';

import type {
  ElementHoverStyle,
  ElementStyle,
  Fill,
  FilterSettings,
  ImageSize,
  ShadowSettings,
  SpacingUnit,
  TextShadowSettings,
  TextStrokeSettings,
} from '../style';
import { BackgroundControl } from './background';
import { BorderControl } from './border';
import { ColorPicker } from './color-picker';
import { Dimensions } from './dimensions';
import { FilterControl } from './filter';
import { GroupShell } from './groups/shell';
import { ImageSizeControl } from './groups/image-size';
import { TextShadowControl } from './groups/text-shadow';
import { TextStrokeControl } from './groups/text-stroke';
import { StateTabs } from './primitives';
import { ShadowControl } from './shadow';
import { TypographyControl } from './typography';

export type ElementPart =
  | 'color'
  | 'typography'
  | 'textStroke'
  | 'textShadow'
  | 'background'
  | 'border'
  | 'shadow'
  | 'padding'
  | 'margin'
  | 'cssFilter'
  | 'imageSize';

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
  const hasTextStroke = parts.includes('textStroke');
  const hasTextShadow = parts.includes('textShadow');
  const hasBg = parts.includes('background');
  const hasBorder = parts.includes('border');
  const hasShadow = parts.includes('shadow');
  const hasPadding = parts.includes('padding');
  const hasMargin = parts.includes('margin');
  const hasFilter = parts.includes('cssFilter');
  const hasImageSize = parts.includes('imageSize');

  const normalPane = (
    <div className="space-y-4">
      {hasColor && (
        <ColorPicker
          label="Text color"
          value={es.color ?? ''}
          onChange={color => set({ color: color || undefined })}
        />
      )}

      {hasTypography && (
        <GroupShell
          label="Typography"
          popover
          value={es.typography}
          onChange={typography => set({ typography })}
        >
          {({ value: val, onChange: onValChange }) => (
            <TypographyControl
              value={val}
              onChange={onValChange}
              defaultFamily="Inter"
              defaultWeight="400"
            />
          )}
        </GroupShell>
      )}

      {hasTextStroke && (
        <GroupShell
          label="Text Stroke"
          popover
          value={es.textStroke ?? es.typography?.textStroke}
          onChange={textStroke => set({ textStroke })}
        >
          {({ value: val, onChange: onValChange }) => (
            <TextStrokeControl value={val} onChange={onValChange} />
          )}
        </GroupShell>
      )}

      {hasTextShadow && (
        <GroupShell
          label="Text Shadow"
          popover
          value={es.textShadow ?? es.typography?.textShadow}
          onChange={textShadow => set({ textShadow })}
        >
          {({ value: val, onChange: onValChange }) => (
            <TextShadowControl value={val} onChange={onValChange} />
          )}
        </GroupShell>
      )}

      {hasBg && (
        <GroupShell
          label="Background"
          value={
            typeof es.fill === 'string'
              ? ({ type: 'color', color: es.fill } as Fill)
              : (es.fill as Fill | undefined)
          }
          onChange={fill => set({ fill })}
        >
          {({ value: val, onChange: onValChange }) => (
            <BackgroundControl value={val} onChange={onValChange} />
          )}
        </GroupShell>
      )}

      {hasBorder && (
        <GroupShell
          label="Border"
          value={es.border}
          onChange={border => set({ border })}
        >
          {({ value: val, onChange: onValChange }) => (
            <BorderControl value={val} onChange={onValChange} />
          )}
        </GroupShell>
      )}

      {hasShadow && (
        <GroupShell
          label="Box Shadow"
          popover
          value={typeof es.shadow === 'object' ? es.shadow : undefined}
          onChange={shadow => set({ shadow })}
        >
          {({ value: val, onChange: onValChange }) => (
            <ShadowControl value={val} onChange={onValChange} />
          )}
        </GroupShell>
      )}

      {hasPadding && (
        <Dimensions
          label="Padding"
          value={es.padding}
          unit={es.paddingUnit ?? 'px'}
          onChange={padding => set({ padding })}
          onUnitChange={paddingUnit => set({ paddingUnit })}
        />
      )}

      {hasMargin && (
        <Dimensions
          label="Margin"
          value={es.margin}
          unit={es.marginUnit ?? 'px'}
          onChange={margin => set({ margin })}
          onUnitChange={marginUnit => set({ marginUnit })}
        />
      )}

      {hasFilter && (
        <GroupShell
          label="CSS Filters"
          popover
          value={es.filter}
          onChange={filter => set({ filter })}
        >
          {({ value: val, onChange: onValChange }) => (
            <FilterControl value={val} onChange={onValChange} />
          )}
        </GroupShell>
      )}

      {hasImageSize && (
        <GroupShell
          label="Image Size"
          value={es.imageSize}
          onChange={imageSize => set({ imageSize })}
        >
          {({ value: val, onChange: onValChange }) => (
            <ImageSizeControl value={val} onChange={onValChange} />
          )}
        </GroupShell>
      )}
    </div>
  );

  const hoverPane = (
    <div className="space-y-4">
      {hasColor && (
        <ColorPicker
          label="Hover text color"
          value={es.hover?.color ?? ''}
          onChange={color => setHover({ color: color || undefined })}
        />
      )}

      {hasBg && (
        <GroupShell
          label="Hover Background"
          value={
            typeof es.hover?.fill === 'string'
              ? ({ type: 'color', color: es.hover.fill } as Fill)
              : (es.hover?.fill as Fill | undefined)
          }
          onChange={fill => setHover({ fill })}
        >
          {({ value: val, onChange: onValChange }) => (
            <BackgroundControl value={val} onChange={onValChange} />
          )}
        </GroupShell>
      )}

      {hasBorder && (
        <ColorPicker
          label="Hover border color"
          value={es.hover?.borderColor ?? ''}
          onChange={borderColor => setHover({ borderColor: borderColor || undefined })}
        />
      )}

      {hasShadow && (
        <GroupShell
          label="Hover Box Shadow"
          popover
          value={es.hover?.shadow}
          onChange={shadow => setHover({ shadow })}
        >
          {({ value: val, onChange: onValChange }) => (
            <ShadowControl value={val} onChange={onValChange} />
          )}
        </GroupShell>
      )}

      {hasFilter && (
        <GroupShell
          label="Hover CSS Filter"
          popover
          value={es.hover?.filter}
          onChange={filter => setHover({ filter })}
        >
          {({ value: val, onChange: onValChange }) => (
            <FilterControl value={val} onChange={onValChange} />
          )}
        </GroupShell>
      )}
    </div>
  );

  const supportsHover = hasColor || hasBg || hasBorder || hasShadow || hasFilter;

  if (!supportsHover) {
    return normalPane;
  }

  return <StateTabs normal={normalPane} hover={hoverPane} />;
}
