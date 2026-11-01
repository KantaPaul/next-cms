import { Palette } from 'lucide-react';
import React from 'react';
import { useId } from 'react';
import { ChooseField } from '../ChooseField';
import { ColorField, type ColorToken } from '../ColorField';
import { ControlRow } from '../ControlRow';
import {
  GRADIENT_PRESETS,
  GradientEditor,
  type GradientConfig,
} from '../GradientEditor';
import { type MediaBrowseHandler, MediaField } from '../MediaField';
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
  /** Opens the host's media library for the classic image. */
  onBrowseImage?: MediaBrowseHandler;
}

export type BackgroundMode = 'classic' | 'gradient';

/** Classic covers a solid color and an image; gradient is its own mode. */
export function backgroundMode(value: BackgroundValue): BackgroundMode {
  return value.type === 'gradient' ? 'gradient' : 'classic';
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
  onBrowseImage,
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

  const mode = backgroundMode(value);

  const update = (patch: Partial<BackgroundValue>) => {
    onChange({ ...value, ...patch });
  };

  // Classic keeps an image when one is set; gradient keeps the classic
  // values so switching back restores them.
  const setMode = (next: BackgroundMode) => {
    if (next === mode) return;
    if (next === 'gradient') {
      update({ type: 'gradient', gradient: value.gradient ?? GRADIENT_PRESETS[0]?.config });
    } else {
      update({ type: value.image?.url ? 'image' : 'color' });
    }
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
    currentType === 'gradient'
      ? `${value.gradient?.type || 'Linear'} ${value.gradient?.angle ?? 90}°`
      : currentType === 'image'
        ? 'Image'
        : `Solid ${value.color || '#ffffff'}`;

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
        {/* Mode: Classic (color + optional image) or Gradient */}
        <ControlRow label="Mode">
          <ChooseField
            value={mode}
            onChange={val => setMode(val as BackgroundMode)}
            options={[
              { value: 'classic', label: 'Classic' },
              { value: 'gradient', label: 'Gradient' },
            ]}
          />
        </ControlRow>

        {mode === 'classic' && (
          <>
            <ColorField
              label="Background Color"
              value={value.color || '#ffffff'}
              onChange={col => update({ color: col })}
              tokens={tokens}
            />
            <MediaField
              label="Image"
              value={{ url: value.image?.url ?? '' }}
              showAlt={false}
              onBrowse={onBrowseImage}
              onChange={media =>
                update({
                  type: media.url ? 'image' : 'color',
                  image: { ...value.image, url: media.url || undefined },
                })
              }
            />
            {value.image?.url && (
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
            )}
          </>
        )}

        {mode === 'gradient' && (
          <GradientEditor
            value={value.gradient}
            onChange={grad => update({ gradient: grad })}
            tokens={tokens}
          />
        )}
      </div>
    </GroupControl>
  );
};
