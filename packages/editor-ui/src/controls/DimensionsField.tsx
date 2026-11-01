import {
  ChevronsUpDown,
  Grid,
  Link,
  MoveHorizontal,
  MoveVertical,
  Unlink,
} from 'lucide-react';
import React from 'react';
import { useId, useState } from 'react';
import { cn } from '../lib/cn';
import { type ControlDeviceState, ControlRow } from './ControlRow';
import { UnitSelect } from './UnitSelect';
import { useScrub } from './useScrub';

export type DimensionsLinkMode = 'all' | 'axial' | 'independent';

export interface DimensionsValue {
  top: number;
  right: number;
  bottom: number;
  left: number;
  unit?: string;
}

export interface DimensionsFieldProps {
  id?: string;
  label?: string;
  value: DimensionsValue;
  onChange: (value: DimensionsValue) => void;
  mode?: DimensionsLinkMode;
  onModeChange?: (mode: DimensionsLinkMode) => void;
  units?: readonly string[] | string[];
  min?: number;
  max?: number;
  step?: number;
  info?: string;
  changed?: boolean;
  onReset?: () => void;
  tokenName?: string;
  onClearToken?: () => void;
  deviceState?: ControlDeviceState;
  helperText?: string;
  errorText?: string;
  disabled?: boolean;
  className?: string;
}

interface SideInputProps {
  side: 'top' | 'right' | 'bottom' | 'left' | 'vertical' | 'horizontal' | 'all';
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  className?: string;
  label?: string;
}

const SideInput: React.FC<SideInputProps> = ({
  side,
  value,
  onChange,
  min = -Infinity,
  max = Infinity,
  step = 1,
  disabled = false,
  className,
  label,
}) => {
  const { onPointerDown } = useScrub({
    value,
    onChange,
    step,
    min,
    max,
    disabled,
  });

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-[var(--ne-radius-sm)] border border-[var(--ne-border)] bg-[var(--ne-surface)] px-1 h-6 text-xs transition-colors focus-within:border-[var(--ne-primary)] focus-within:ring-1 focus-within:ring-[var(--ne-primary)]',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      {label && (
        <span
          onPointerDown={disabled ? undefined : onPointerDown}
          className="cursor-ew-resize font-mono text-[9px] uppercase tracking-wider text-[var(--ne-text-muted)] select-none pe-1 hover:text-[var(--ne-primary)]"
          title={`Drag to scrub ${label}`}
        >
          {label}
        </span>
      )}
      <input
        type="number"
        value={Number.isFinite(value) ? value : 0}
        disabled={disabled}
        min={min}
        max={max}
        step={step}
        onChange={e => {
          const val = parseFloat(e.target.value);
          if (!Number.isNaN(val)) onChange(val);
        }}
        className="w-10 bg-transparent text-center font-mono text-[11px] tabular-nums text-[var(--ne-text)] focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />
    </div>
  );
};

export const DimensionsField: React.FC<DimensionsFieldProps> = ({
  id,
  label,
  value,
  onChange,
  mode: controlledMode,
  onModeChange,
  units,
  min = 0,
  max = Infinity,
  step = 1,
  info,
  changed,
  onReset,
  tokenName,
  onClearToken,
  deviceState,
  helperText,
  errorText,
  disabled = false,
  className,
}) => {
  const generatedId = useId();
  const fieldId =
    id ?? (label ? `field-${label.toLowerCase().replace(/\s+/g, '-')}` : generatedId);
  const [internalMode, setInternalMode] = useState<DimensionsLinkMode>('all');
  const activeMode = controlledMode ?? internalMode;

  const handleModeChange = (nextMode: DimensionsLinkMode) => {
    if (onModeChange) onModeChange(nextMode);
    else setInternalMode(nextMode);
  };

  const handleUnitChange = (unit: string) => {
    onChange({ ...value, unit });
  };

  const updateSide = (side: 'top' | 'right' | 'bottom' | 'left', next: number) => {
    if (activeMode === 'all') {
      onChange({
        ...value,
        top: next,
        right: next,
        bottom: next,
        left: next,
      });
    } else if (activeMode === 'axial') {
      if (side === 'top' || side === 'bottom') {
        onChange({ ...value, top: next, bottom: next });
      } else {
        onChange({ ...value, right: next, left: next });
      }
    } else {
      onChange({ ...value, [side]: next });
    }
  };

  const content = (
    <div className="space-y-2 w-full">
      {/* Header controls: Link mode switch & unit */}
      <div className="flex items-center justify-between gap-2">
        <div
          role="radiogroup"
          aria-label="Link mode"
          className="inline-flex items-center rounded-[var(--ne-radius-sm)] border border-[var(--ne-border)] bg-[var(--ne-surface-subtle)] p-0.5 gap-0.5"
        >
          <button
            type="button"
            role="radio"
            aria-checked={activeMode === 'all'}
            title="All sides linked"
            aria-label="All sides linked"
            disabled={disabled}
            onClick={() => handleModeChange('all')}
            className={cn(
              'rounded-[var(--ne-radius-xs)] p-1 text-[var(--ne-text-muted)] transition-colors hover:text-[var(--ne-text)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--ne-focus-ring)]',
              activeMode === 'all' &&
                'bg-[var(--ne-surface)] text-[var(--ne-primary)] shadow-xs'
            )}
          >
            <Link className="h-3 w-3" />
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={activeMode === 'axial'}
            title="Horizontal & vertical split"
            aria-label="Horizontal & vertical split"
            disabled={disabled}
            onClick={() => handleModeChange('axial')}
            className={cn(
              'rounded-[var(--ne-radius-xs)] p-1 text-[var(--ne-text-muted)] transition-colors hover:text-[var(--ne-text)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--ne-focus-ring)]',
              activeMode === 'axial' &&
                'bg-[var(--ne-surface)] text-[var(--ne-primary)] shadow-xs'
            )}
          >
            <ChevronsUpDown className="h-3 w-3" />
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={activeMode === 'independent'}
            title="Independent sides"
            aria-label="Independent sides"
            disabled={disabled}
            onClick={() => handleModeChange('independent')}
            className={cn(
              'rounded-[var(--ne-radius-xs)] p-1 text-[var(--ne-text-muted)] transition-colors hover:text-[var(--ne-text)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--ne-focus-ring)]',
              activeMode === 'independent' &&
                'bg-[var(--ne-surface)] text-[var(--ne-primary)] shadow-xs'
            )}
          >
            <Unlink className="h-3 w-3" />
          </button>
        </div>

        {value.unit !== undefined && (
          <UnitSelect
            value={value.unit}
            onChange={handleUnitChange}
            units={units}
            disabled={disabled}
            size="sm"
          />
        )}
      </div>

      {/* Mini Box Diagram */}
      <div className="relative rounded-[var(--ne-radius-md)] border border-dashed border-[var(--ne-border-strong)] bg-[var(--ne-surface-subtle)] p-3">
        {activeMode === 'all' && (
          <div className="flex flex-col items-center justify-center py-2">
            <SideInput
              side="all"
              label="All"
              value={value.top}
              onChange={val => updateSide('top', val)}
              min={min}
              max={max}
              step={step}
              disabled={disabled}
              className="w-24 justify-center"
            />
          </div>
        )}

        {activeMode === 'axial' && (
          <div className="flex items-center justify-center gap-4 py-2">
            <SideInput
              side="vertical"
              label="Y"
              value={value.top}
              onChange={val => updateSide('top', val)}
              min={min}
              max={max}
              step={step}
              disabled={disabled}
              className="w-20"
            />
            <SideInput
              side="horizontal"
              label="X"
              value={value.right}
              onChange={val => updateSide('right', val)}
              min={min}
              max={max}
              step={step}
              disabled={disabled}
              className="w-20"
            />
          </div>
        )}

        {activeMode === 'independent' && (
          <div className="flex flex-col items-center gap-1.5">
            {/* Top */}
            <SideInput
              side="top"
              label="T"
              value={value.top}
              onChange={val => updateSide('top', val)}
              min={min}
              max={max}
              step={step}
              disabled={disabled}
            />
            {/* Middle: Left - Center Core - Right */}
            <div className="flex items-center justify-between w-full">
              <SideInput
                side="left"
                label="L"
                value={value.left}
                onChange={val => updateSide('left', val)}
                min={min}
                max={max}
                step={step}
                disabled={disabled}
              />
              <div className="h-6 w-12 rounded-[var(--ne-radius-sm)] border border-[var(--ne-border)] bg-[var(--ne-surface)] flex items-center justify-center">
                <span className="text-[9px] uppercase tracking-wider text-[var(--ne-text-muted)] font-mono">
                  Box
                </span>
              </div>
              <SideInput
                side="right"
                label="R"
                value={value.right}
                onChange={val => updateSide('right', val)}
                min={min}
                max={max}
                step={step}
                disabled={disabled}
              />
            </div>
            {/* Bottom */}
            <SideInput
              side="bottom"
              label="B"
              value={value.bottom}
              onChange={val => updateSide('bottom', val)}
              min={min}
              max={max}
              step={step}
              disabled={disabled}
            />
          </div>
        )}
      </div>
    </div>
  );

  if (!label) {
    return <div className={className}>{content}</div>;
  }

  return (
    <ControlRow
      label={label}
      htmlFor={fieldId}
      labelPosition="above"
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
