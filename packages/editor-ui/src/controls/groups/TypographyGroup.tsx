import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Type,
} from 'lucide-react';
import React from 'react';
import { useId } from 'react';
import { ChooseField } from '../ChooseField';
import { ColorField, type ColorToken } from '../ColorField';
import { ControlRow } from '../ControlRow';
import {
  type ControlState,
  GroupControl,
  type GroupControlProps,
  type GroupPreset,
} from '../GroupControl';
import { NumberField } from '../NumberField';
import { SelectField } from '../SelectField';

export interface TypographyValue {
  fontFamily?: string;
  fontSize?: number | string;
  fontWeight?: number | string;
  lineHeight?: number | string;
  letterSpacing?: number | string;
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
  textDecoration?: 'none' | 'underline' | 'line-through';
  color?: string;
}

export interface TypographyGroupProps extends Omit<GroupControlProps, 'title' | 'children' | 'presets' | 'onSelectPreset'> {
  value?: TypographyValue;
  onChange: (value: TypographyValue) => void;
  tokens?: readonly ColorToken[] | ColorToken[];
  presets?: readonly GroupPreset[] | GroupPreset[];
  onSelectPreset?: (preset: GroupPreset) => void;
}

const FONT_FAMILIES = [
  { value: 'Inter, system-ui, sans-serif', label: 'Inter' },
  { value: "'Plus Jakarta Sans', sans-serif", label: 'Plus Jakarta Sans' },
  { value: 'Roboto, sans-serif', label: 'Roboto' },
  { value: "'JetBrains Mono', monospace", label: 'JetBrains Mono' },
  { value: 'Georgia, serif', label: 'Georgia' },
  { value: 'system-ui, sans-serif', label: 'System Default' },
];

const FONT_WEIGHTS = [
  { value: '300', label: '300 Light' },
  { value: '400', label: '400 Regular' },
  { value: '500', label: '500 Medium' },
  { value: '600', label: '600 SemiBold' },
  { value: '700', label: '700 Bold' },
  { value: '800', label: '800 ExtraBold' },
];

export const TYPOGRAPHY_PRESETS: GroupPreset[] = [
  { id: 'h1', label: 'H1 32px' },
  { id: 'h2', label: 'H2 24px' },
  { id: 'body', label: 'Body 14px' },
  { id: 'caption', label: 'Caption 12px' },
  { id: 'mono', label: 'Code 13px' },
];

export const TypographyGroup: React.FC<TypographyGroupProps> = ({
  value = {},
  onChange,
  tokens,
  presets = TYPOGRAPHY_PRESETS,
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

  const update = (patch: Partial<TypographyValue>) => {
    onChange({ ...value, ...patch });
  };

  const handleSelectPreset = (preset: GroupPreset) => {
    if (onSelectPreset) {
      onSelectPreset(preset);
      return;
    }
    switch (preset.id) {
      case 'h1':
        onChange({ ...value, fontSize: 32, fontWeight: '700', lineHeight: 1.2 });
        break;
      case 'h2':
        onChange({ ...value, fontSize: 24, fontWeight: '600', lineHeight: 1.3 });
        break;
      case 'body':
        onChange({ ...value, fontSize: 14, fontWeight: '400', lineHeight: 1.5 });
        break;
      case 'caption':
        onChange({ ...value, fontSize: 12, fontWeight: '400', lineHeight: 1.4 });
        break;
      case 'mono':
        onChange({
          ...value,
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 13,
          fontWeight: '400',
        });
        break;
    }
  };

  const fontSizeNum =
    typeof value.fontSize === 'number'
      ? value.fontSize
      : Number.parseFloat(String(value.fontSize || '14')) || 14;

  const lineHeightNum =
    typeof value.lineHeight === 'number'
      ? value.lineHeight
      : Number.parseFloat(String(value.lineHeight || '1.4')) || 1.4;

  const letterSpacingNum =
    typeof value.letterSpacing === 'number'
      ? value.letterSpacing
      : Number.parseFloat(String(value.letterSpacing || '0')) || 0;

  // Build a concise summary text
  const familyLabel =
    FONT_FAMILIES.find(f => f.value === value.fontFamily)?.label ||
    value.fontFamily ||
    'Inter';
  const summaryText = `${familyLabel} · ${fontSizeNum}px · ${value.fontWeight || '400'}`;

  return (
    <GroupControl
      title="Typography"
      icon={<Type size={16} />}
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
        {/* Font Family */}
        <SelectField
          label="Font Family"
          value={value.fontFamily || FONT_FAMILIES[0].value}
          onChange={val => update({ fontFamily: val })}
          options={FONT_FAMILIES}
        />

        {/* Font Size & Weight */}
        <div className="grid grid-cols-2 gap-2">
          <NumberField
            label="Size"
            value={fontSizeNum}
            onChange={val => update({ fontSize: val })}
            min={8}
            max={128}
            step={1}
            units={['px', 'rem']}
            unit="px"
          />
          <SelectField
            label="Weight"
            value={String(value.fontWeight || '400')}
            onChange={val => update({ fontWeight: val })}
            options={FONT_WEIGHTS}
          />
        </div>

        {/* Line Height & Letter Spacing */}
        <div className="grid grid-cols-2 gap-2">
          <NumberField
            label="Line Height"
            value={lineHeightNum}
            onChange={val => update({ lineHeight: val })}
            min={0.5}
            max={3.0}
            step={0.1}
          />
          <NumberField
            label="Spacing"
            value={letterSpacingNum}
            onChange={val => update({ letterSpacing: val })}
            min={-5}
            max={20}
            step={0.5}
            unit="px"
          />
        </div>

        {/* Text Align */}
        <ControlRow label="Align">
          <ChooseField
            value={value.textAlign || 'left'}
            onChange={val => update({ textAlign: val as TypographyValue['textAlign'] })}
            options={[
              { value: 'left', label: 'Left', icon: <AlignLeft size={14} /> },
              { value: 'center', label: 'Center', icon: <AlignCenter size={14} /> },
              { value: 'right', label: 'Right', icon: <AlignRight size={14} /> },
              { value: 'justify', label: 'Justify', icon: <AlignJustify size={14} /> },
            ]}
          />
        </ControlRow>

        {/* Text Color */}
        <ColorField
          label="Color"
          value={value.color || '#0f172a'}
          onChange={col => update({ color: col })}
          tokens={tokens}
        />
      </div>
    </GroupControl>
  );
};
