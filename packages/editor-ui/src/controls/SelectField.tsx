import React from 'react';
import { useId } from 'react';
import { Select, type SelectOption } from '../primitives/Select';
import { type ControlDeviceState, ControlRow } from './ControlRow';

export interface SelectFieldProps {
  id?: string;
  label?: string;
  value?: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  info?: string;
  changed?: boolean;
  onReset?: () => void;
  tokenName?: string;
  onClearToken?: () => void;
  deviceState?: ControlDeviceState;
  helperText?: string;
  errorText?: string;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const SelectField: React.FC<SelectFieldProps> = ({
  id,
  label,
  value,
  onChange,
  options,
  placeholder,
  info,
  changed,
  onReset,
  tokenName,
  onClearToken,
  deviceState,
  helperText,
  errorText,
  disabled = false,
  size = 'md',
  className,
}) => {
  const generatedId = useId();
  const fieldId =
    id ?? (label ? `field-${label.toLowerCase().replace(/\s+/g, '-')}` : generatedId);

  const content = (
    <Select
      id={fieldId}
      value={value}
      options={options}
      onValueChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      size={size}
      aria-label={label}
    />
  );

  if (!label) {
    return <div className={className}>{content}</div>;
  }

  return (
    <ControlRow
      label={label}
      htmlFor={fieldId}
      info={info}
      changed={changed}
      onReset={onReset}
      tokenName={tokenName}
      onClearToken={onClearToken}
      deviceState={deviceState}
      helperText={helperText}
      errorText={errorText}
      className={className}
    >
      {content}
    </ControlRow>
  );
};
