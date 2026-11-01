import { Palette } from 'lucide-react';
import React from 'react';
import { useId } from 'react';
import { ChooseField } from '../ChooseField';
import { ColorField, type ColorToken } from '../ColorField';
import { ControlRow } from '../ControlRow';
import { GradientEditor, type GradientConfig } from '../GradientEditor';
import {
  GroupControl,
  type GroupControlProps,
  type GroupPreset,
} from '../GroupControl';
import { SelectField } from '../SelectField';

export interface BackgroundImageConfig {
  url?: string;
  position?: string;
  size?: 'cover' | 'contain' | 'auto';
  repeat?: 'no-repeat' | 'repeat' | 'repeat-x' | 'repeat-y';
}

export interface BackgroundValue {
  type?: 'color' | 'gradient' | 'image';
  color?: string;
  gradient?: GradientConfig;
  image?: BackgroundImageConfig;
}

export interface BackgroundGroupProps extends Omit<GroupControlProps, 'title' | 'children' | 'presets' | 'onSelectPreset'> {
  value?: BackgroundValue;
  onChange: (value: BackgroundValue) => void;
  tokens?: readonly ColorToken[] | ColorToken[];
  presets?: readonly GroupPreset[] | GroupPreset[];
  onSelectPreset?: (preset: GroupPreset) => void;
}

export const BACKGROUND_PRESETS: GroupPreset[] = [
  { id: 'white', label: 'White' },
  { id: 'surface', label: 'Surface' },
  { id: 'dark', label: 'Dark' },
  { id: 'sunset', label: 'Sunset Grad' },
  { id: 'ocean', label: 'Ocean Grad' },
];

export const BackgroundGroup: React.FC<BackgroundGroupProps> = ({
  value = { type: 'color', color: '#ffffff' },
  onChange,
  tokens,
  presets = BACKGROUND_PRESETS,
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

  const currentType = value.type || 'color';

  const update = (patch: Partial<BackgroundValue>) => {
    onChange({ ...value, ...patch });
  };

  const handleSelectPreset = (preset: GroupPreset) => {
    if (onSelectPreset) {
      onSelectPreset(preset);
      return;
    }
    switch (preset.id) {
      case 'white':
        onChange({ type: 'color', color: '#ffffff' });
        break;
      case 'surface':
        onChange({ type: 'color', color: '#f8fafc' });
        break;
      case 'dark':
        onChange({ type: 'color', color: '#0f172a' });
        break;
      case 'sunset':
        onChange({
          type: 'gradient',
          gradient: {
            type: 'linear',
            angle: 90,
            stops: [
              { color: '#f97316', offset: 0 },
              { color: '#ec4899', offset: 100 },
            ],
          },
        });
        break;
      case 'ocean':
        onChange({
          type: 'gradient',
          gradient: {
            type: 'linear',
            angle: 135,
            stops: [
              { color: '#06b6d4', offset: 0 },
              { color: '#3b82f6', offset: 100 },
            ],
          },
        });
        break;
    }
  };

  const summaryText =
    currentType === 'color'
      ? `Solid ${value.color || '#ffffff'}`
      : currentType === 'gradient'
        ? `${value.gradient?.type || 'Linear'} ${value.gradient?.angle ?? 90}°`
        : 'Image';

  return (
    <GroupControl
      title="Background"
      icon={<Palette size={16} />}
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
        {/* Mode Selector */}
        <ControlRow label="Mode">
          <ChooseField
            value={currentType}
            onChange={val => update({ type: val as BackgroundValue['type'] })}
            options={[
              { value: 'color', label: 'Solid' },
              { value: 'gradient', label: 'Gradient' },
              { value: 'image', label: 'Image' },
            ]}
          />
        </ControlRow>

        {/* Solid Color */}
        {currentType === 'color' && (
          <ColorField
            label="Background Color"
            value={value.color || '#ffffff'}
            onChange={col => update({ color: col })}
            tokens={tokens}
          />
        )}

        {/* Gradient */}
        {currentType === 'gradient' && (
          <GradientEditor
            value={value.gradient}
            onChange={grad => update({ gradient: grad })}
            tokens={tokens}
          />
        )}

        {/* Image */}
        {currentType === 'image' && (
          <div className="flex flex-col gap-2">
            <ControlRow label="Image URL">
              <input
                type="text"
                placeholder="https://..."
                value={value.image?.url || ''}
                onChange={e =>
                  update({
                    image: { ...value.image, url: e.target.value },
                  })
                }
                className="w-full h-7 px-2 text-xs rounded border border-[var(--ne-border)] bg-[var(--ne-surface)] text-[var(--ne-text)] focus:outline-none focus:border-[var(--ne-primary)]"
              />
            </ControlRow>
            <div className="grid grid-cols-2 gap-2">
              <SelectField
                label="Size"
                value={value.image?.size || 'cover'}
                onChange={s =>
                  update({
                    image: {
                      ...value.image,
                      size: s as BackgroundImageConfig['size'],
                    },
                  })
                }
                options={[
                  { value: 'cover', label: 'Cover' },
                  { value: 'contain', label: 'Contain' },
                  { value: 'auto', label: 'Auto' },
                ]}
              />
              <SelectField
                label="Repeat"
                value={value.image?.repeat || 'no-repeat'}
                onChange={r =>
                  update({
                    image: {
                      ...value.image,
                      repeat: r as BackgroundImageConfig['repeat'],
                    },
                  })
                }
                options={[
                  { value: 'no-repeat', label: 'No repeat' },
                  { value: 'repeat', label: 'Repeat' },
                  { value: 'repeat-x', label: 'Repeat X' },
                  { value: 'repeat-y', label: 'Repeat Y' },
                ]}
              />
            </div>
          </div>
        )}
      </div>
    </GroupControl>
  );
};
