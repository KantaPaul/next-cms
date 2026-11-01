import { Square } from 'lucide-react';
import React from 'react';
import { useId } from 'react';
import { ChooseField } from '../ChooseField';
import { ColorField, type ColorToken } from '../ColorField';
import { ControlRow } from '../ControlRow';
import { DimensionsField, type DimensionsValue } from '../DimensionsField';
import {
  GroupControl,
  type GroupControlProps,
  type GroupPreset,
} from '../GroupControl';

export interface BorderValue {
  style?: 'none' | 'solid' | 'dashed' | 'dotted' | 'double';
  width?: number | string | DimensionsValue;
  color?: string;
  radius?: number | string | DimensionsValue;
}

export interface BorderGroupProps extends Omit<GroupControlProps, 'title' | 'children' | 'presets' | 'onSelectPreset'> {
  value?: BorderValue;
  onChange: (value: BorderValue) => void;
  tokens?: readonly ColorToken[] | ColorToken[];
  presets?: readonly GroupPreset[] | GroupPreset[];
  onSelectPreset?: (preset: GroupPreset) => void;
}

export const BORDER_PRESETS: GroupPreset[] = [
  { id: 'none', label: 'None' },
  { id: 'subtle', label: 'Subtle 1px' },
  { id: 'medium', label: 'Medium 2px' },
  { id: 'pill', label: 'Pill Radius' },
];

function toDimensionsValue(val: number | string | DimensionsValue | undefined): DimensionsValue {
  if (typeof val === 'number') {
    return { top: val, right: val, bottom: val, left: val };
  }
  if (typeof val === 'string') {
    const num = Number.parseFloat(val) || 0;
    return { top: num, right: num, bottom: num, left: num };
  }
  if (val && typeof val === 'object') {
    return {
      top: Number(val.top ?? 0),
      right: Number(val.right ?? 0),
      bottom: Number(val.bottom ?? 0),
      left: Number(val.left ?? 0),
      unit: val.unit,
    };
  }
  return { top: 0, right: 0, bottom: 0, left: 0 };
}

export const BorderGroup: React.FC<BorderGroupProps> = ({
  value = {},
  onChange,
  tokens,
  presets = BORDER_PRESETS,
  onSelectPreset,
  open,
  defaultOpen,
  onOpenChange,
  changedCount,
  onReset,
  onCopy,
  onPaste,
  canPaste,
  state,
  onStateChange,
  states,
  enabled,
  onEnabledChange,
  className,
}) => {
  const generatedId = useId();

  const update = (patch: Partial<BorderValue>) => {
    onChange({ ...value, ...patch });
  };

  const handleSelectPreset = (preset: GroupPreset) => {
    if (onSelectPreset) {
      onSelectPreset(preset);
      return;
    }
    switch (preset.id) {
      case 'none':
        onChange({ style: 'none', width: 0, color: 'transparent', radius: 0 });
        break;
      case 'subtle':
        onChange({ style: 'solid', width: 1, color: '#e2e8f0', radius: 6 });
        break;
      case 'medium':
        onChange({ style: 'solid', width: 2, color: '#94a3b8', radius: 8 });
        break;
      case 'pill':
        onChange({ ...value, style: 'solid', width: 1, radius: 9999 });
        break;
    }
  };

  const currentStyle = value.style || 'solid';
  const widthDim = toDimensionsValue(value.width);
  const radiusDim = toDimensionsValue(value.radius);

  const summaryText =
    currentStyle === 'none'
      ? 'None'
      : `${widthDim.top ?? 1}px ${currentStyle} ${value.color || '#e2e8f0'}`;

  return (
    <GroupControl
      title="Border"
      icon={<Square size={16} />}
      summary={summaryText}
      open={open}
      defaultOpen={defaultOpen}
      onOpenChange={onOpenChange}
      changedCount={changedCount}
      onReset={onReset}
      onCopy={onCopy}
      onPaste={onPaste}
      canPaste={canPaste}
      state={state}
      onStateChange={onStateChange}
      states={states}
      presets={presets}
      onSelectPreset={handleSelectPreset}
      enabled={enabled}
      onEnabledChange={onEnabledChange}
      className={className}
    >
      <div className="flex flex-col gap-3">
        {/* Border Style */}
        <ControlRow label="Style">
          <ChooseField
            value={currentStyle}
            onChange={val => update({ style: val as BorderValue['style'] })}
            options={[
              { value: 'none', label: 'None' },
              { value: 'solid', label: 'Solid' },
              { value: 'dashed', label: 'Dashed' },
              { value: 'dotted', label: 'Dotted' },
            ]}
          />
        </ControlRow>

        {currentStyle !== 'none' && (
          <>
            {/* Border Width */}
            <DimensionsField
              label="Width"
              value={widthDim}
              onChange={val => update({ width: val })}
              units={['px']}
            />

            {/* Border Color */}
            <ColorField
              label="Color"
              value={value.color || '#e2e8f0'}
              onChange={col => update({ color: col })}
              tokens={tokens}
            />
          </>
        )}

        {/* Border Radius */}
        <DimensionsField
          label="Radius"
          value={radiusDim}
          onChange={val => update({ radius: val })}
          units={['px', '%']}
        />
      </div>
    </GroupControl>
  );
};
