import React from 'react';
import { useId } from 'react';
import { cn } from '../lib/cn';
import { NumberInput } from '../primitives/NumberInput';
import { type ControlDeviceState, ControlRow } from './ControlRow';
import { clamp, tickPercent } from './math';
import { useScrub } from './useScrub';

export interface SliderFieldProps {
  id?: string;
  label?: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  defaultValue?: number;
  /** Ticks along the track, placed by tickPercent (0-100%). */
  ticks?: readonly number[] | number[];
  unit?: string;
  showInput?: boolean;
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
  size?: 'sm' | 'md';
  className?: string;
}

export const SliderField: React.FC<SliderFieldProps> = ({
  id,
  label,
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  defaultValue,
  ticks,
  unit,
  showInput = true,
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
  const fieldId =
    id ?? (label ? `field-${label.toLowerCase().replace(/\s+/g, '-')}` : generatedId);
  const isInteractive = !disabled && !readOnly;

  const { onPointerDown } = useScrub({
    value,
    onChange,
    step,
    min,
    max,
    disabled: !isInteractive,
  });

  const handleDoubleClick = () => {
    if (!isInteractive) return;
    onChange(defaultValue ?? min);
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = parseFloat(e.target.value);
    if (!Number.isNaN(next)) {
      onChange(clamp(next, min, max));
    }
  };

  const sliderTrack = (
    <div
      className="relative flex-1 flex flex-col justify-center py-1 group"
      onDoubleClick={handleDoubleClick}
      title="Double-click to reset"
    >
      <input
        type="range"
        id={fieldId}
        min={min}
        max={max}
        step={step}
        value={Number.isFinite(value) ? value : min}
        onChange={handleSliderChange}
        disabled={!isInteractive}
        className={cn(
          'w-full cursor-pointer appearance-none rounded-full bg-[var(--ne-border)] accent-[var(--ne-primary)] focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--ne-focus-ring)] disabled:cursor-not-allowed disabled:opacity-40 transition-colors',
          size === 'sm' ? 'h-1' : 'h-1.5'
        )}
      />
      {ticks && ticks.length > 0 && (
        <div
          className="relative w-full h-1.5 mt-1 select-none pointer-events-none"
          aria-hidden="true"
        >
          {ticks.map(tick => {
            const pct = tickPercent(tick, min, max);
            return (
              <div
                key={tick}
                className="absolute -translate-x-1/2 top-0 flex flex-col items-center"
                style={{ insetInlineStart: `${pct}%` }}
              >
                <div className="w-0.5 h-1 bg-[var(--ne-border-strong)] rounded-full" />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  const content = (
    <div className="flex items-center gap-2 w-full">
      {sliderTrack}
      {showInput && (
        <NumberInput
          value={value}
          onChange={onChange}
          min={min}
          max={max}
          step={step}
          unit={unit}
          disabled={!isInteractive}
          size="sm"
          className="w-16 shrink-0"
        />
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
