import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  LayoutGrid,
} from 'lucide-react';
import React from 'react';
import { useId } from 'react';
import { AlignmentPad, type AlignmentValue } from '../AlignmentPad';
import { ChooseField } from '../ChooseField';
import { ControlRow } from '../ControlRow';
import {
  GroupControl,
  type GroupControlProps,
  type GroupPreset,
} from '../GroupControl';
import { NumberField } from '../NumberField';

export interface FlexContainerValue {
  display?: 'flex' | 'inline-flex';
  direction?: 'row' | 'column' | 'row-reverse' | 'column-reverse';
  wrap?: 'nowrap' | 'wrap' | 'wrap-reverse';
  justifyContent?: 'start' | 'center' | 'end' | 'space-between' | 'space-around' | 'space-evenly';
  alignItems?: 'start' | 'center' | 'end' | 'stretch' | 'baseline';
  gap?: number | string;
}

export interface FlexContainerGroupProps extends Omit<GroupControlProps, 'title' | 'children' | 'presets' | 'onSelectPreset'> {
  value?: FlexContainerValue;
  onChange: (value: FlexContainerValue) => void;
  presets?: readonly GroupPreset[] | GroupPreset[];
  onSelectPreset?: (preset: GroupPreset) => void;
}

export const FLEX_PRESETS: GroupPreset[] = [
  { id: 'row-center', label: 'Row Center' },
  { id: 'col-stack', label: 'Col Stack' },
  { id: 'space-between', label: 'Between' },
  { id: 'grid-wrap', label: 'Wrap Grid' },
];

export const FlexContainerGroup: React.FC<FlexContainerGroupProps> = ({
  value = {
    display: 'flex',
    direction: 'row',
    wrap: 'nowrap',
    justifyContent: 'start',
    alignItems: 'start',
    gap: 16,
  },
  onChange,
  presets = FLEX_PRESETS,
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

  const update = (patch: Partial<FlexContainerValue>) => {
    onChange({ ...value, ...patch });
  };

  const handleSelectPreset = (preset: GroupPreset) => {
    if (onSelectPreset) {
      onSelectPreset(preset);
      return;
    }
    switch (preset.id) {
      case 'row-center':
        onChange({
          ...value,
          display: 'flex',
          direction: 'row',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 16,
        });
        break;
      case 'col-stack':
        onChange({
          ...value,
          display: 'flex',
          direction: 'column',
          justifyContent: 'start',
          alignItems: 'stretch',
          gap: 12,
        });
        break;
      case 'space-between':
        onChange({
          ...value,
          display: 'flex',
          direction: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 16,
        });
        break;
      case 'grid-wrap':
        onChange({
          ...value,
          display: 'flex',
          direction: 'row',
          wrap: 'wrap',
          justifyContent: 'start',
          alignItems: 'start',
          gap: 16,
        });
        break;
    }
  };

  const gapNum =
    typeof value.gap === 'number'
      ? value.gap
      : Number.parseFloat(String(value.gap || '0')) || 0;

  const currentDirection = value.direction || 'row';
  const currentJustify = value.justifyContent || 'start';
  const currentAlign = value.alignItems || 'start';

  const summaryText = `${currentDirection} · ${currentJustify}/${currentAlign} · gap ${gapNum}px`;

  return (
    <GroupControl
      title="Flex Container"
      icon={<LayoutGrid size={16} />}
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
        {/* Direction */}
        <ControlRow label="Direction">
          <ChooseField
            value={currentDirection}
            onChange={dir => update({ direction: dir as FlexContainerValue['direction'] })}
            options={[
              { value: 'row', label: 'Row', icon: <ArrowRight size={14} /> },
              { value: 'column', label: 'Column', icon: <ArrowDown size={14} /> },
              { value: 'row-reverse', label: 'Row Rev', icon: <ArrowLeft size={14} /> },
              { value: 'column-reverse', label: 'Col Rev', icon: <ArrowUp size={14} /> },
            ]}
          />
        </ControlRow>

        {/* Wrap & Display */}
        <div className="grid grid-cols-2 gap-2">
          <ControlRow label="Wrap">
            <ChooseField
              value={value.wrap || 'nowrap'}
              onChange={w => update({ wrap: w as FlexContainerValue['wrap'] })}
              options={[
                { value: 'nowrap', label: 'No wrap' },
                { value: 'wrap', label: 'Wrap' },
              ]}
            />
          </ControlRow>
          <ControlRow label="Display">
            <ChooseField
              value={value.display || 'flex'}
              onChange={d => update({ display: d as FlexContainerValue['display'] })}
              options={[
                { value: 'flex', label: 'Flex' },
                { value: 'inline-flex', label: 'Inline' },
              ]}
            />
          </ControlRow>
        </div>

        {/* Alignment Pad */}
        <AlignmentPad
          value={{
            justify: currentJustify,
            align: currentAlign,
          }}
          onChange={next =>
            update({
              justifyContent: next.justify,
              alignItems: next.align,
            })
          }
        />

        {/* Gap */}
        <NumberField
          label="Gap"
          value={gapNum}
          onChange={val => update({ gap: val })}
          min={0}
          max={128}
          step={2}
          units={['px', 'rem']}
          unit="px"
        />
      </div>
    </GroupControl>
  );
};
