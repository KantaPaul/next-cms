import React from 'react';
import { useId } from 'react';
import { cn } from '../lib/cn';
import { NumberInput } from '../primitives/NumberInput';
import { type ControlDeviceState, ControlRow } from './ControlRow';
import { useScrub } from './useScrub';

export interface NumberFieldProps {
  id?: string;
  label?: string;
  value?: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  /** Single fixed unit suffix (when units list is not used). */
  unit?: string;
  /** Available units rendered as a radio group of chips. */
  units?: readonly string[] | string[];
  /** Currently selected unit. */
  onUnitChange?: (unit: string) => void;
  info?: string;
  changed?: boolean;
  onReset?: () => void;
  tokenName?: string;
  onClearToken?: () => void;
  deviceState?: ControlDeviceState;
  helperText?: string;
  errorText?: string;
  disabled?: boolean;
  readOnly?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const NumberField: React.FC<NumberFieldProps> = ({
  id,
  label,
  value = 0,
  onChange,
  min = -Infinity,
  max = Infinity,
  step = 1,
  unit,
  units,
  onUnitChange,
  info,
  changed,
  onReset,
  tokenName,
  onClearToken,
  deviceState,
  helperText,
  errorText,
  disabled = false,
  readOnly = false,
  size = 'md',
  className,
}) => {
  const generatedId = useId();
  const fieldId = id ?? (label ? `field-${label.toLowerCase().replace(/\s+/g, '-')}` : generatedId);
  const isInteractive = !disabled && !readOnly;

  const { onPointerDown } = useScrub({
    value,
    onChange,
    step,
    min,
    max,
    disabled: !isInteractive,
  });

  const handleUnitKeyDown = (
    e: React.KeyboardEvent<HTMLDivElement>,
    currentUnit?: string
  ) => {
    if (!units || units.length === 0 || !onUnitChange || !isInteractive) return;
    const currentIndex = currentUnit ? units.indexOf(currentUnit) : 0;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex = (currentIndex + 1) % units.length;
      onUnitChange(units[nextIndex]);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIndex = (currentIndex - 1 + units.length) % units.length;
      onUnitChange(units[prevIndex]);
    }
  };

  const content = (
    <div className="flex items-center gap-1.5 w-full">
      <div className="min-w-0 flex-1">
        <NumberInput
          id={fieldId}
          value={value}
          onChange={onChange}
          min={min}
          max={max}
          step={step}
          unit={units && units.length > 0 ? undefined : unit}
          disabled={!isInteractive}
          size={size}
        />
      </div>
      {units && units.length > 0 && (
        <div
          role="radiogroup"
          aria-label={label ? `${label} unit` : 'Unit'}
          onKeyDown={e => handleUnitKeyDown(e, unit)}
          className="inline-flex shrink-0 items-center rounded-[var(--ne-radius-md)] border border-[var(--ne-border)] bg-[var(--ne-surface-subtle)] p-0.5 gap-0.5"
        >
          {units.map(u => {
            const isSelected = u === unit;
            return (
              <button
                key={u}
                type="button"
                role="radio"
                aria-checked={isSelected}
                tabIndex={isSelected ? 0 : -1}
                disabled={!isInteractive}
                onClick={() => onUnitChange?.(u)}
                className={cn(
                  'rounded-[var(--ne-radius-sm)] px-1.5 py-0.5 font-mono text-[10px] uppercase transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--ne-focus-ring)] disabled:cursor-not-allowed disabled:opacity-40',
                  isSelected
                    ? 'bg-[var(--ne-surface)] font-semibold text-[var(--ne-primary)] shadow-xs'
                    : 'text-[var(--ne-text-muted)] hover:text-[var(--ne-text)]'
                )}
              >
                {u}
              </button>
            );
          })}
        </div>
      )}
    </div>
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
      onLabelPointerDown={isInteractive ? onPointerDown : undefined}
      className={className}
    >
      {content}
    </ControlRow>
  );
};
