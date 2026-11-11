import { Minus, Plus } from 'lucide-react';
import React, { useEffect, useId, useRef, useState } from 'react';
import { cn } from '../lib/cn';
import { RollingNumber } from '../lib/motion/RollingNumber';
import { useHoldRepeat } from '../lib/motion/useHoldRepeat';
import { NumberInput } from '../primitives/NumberInput';
import { type ControlDeviceState, ControlRow } from './ControlRow';
import { clamp, roundTo } from './math';
import { useScrub } from './useScrub';

export interface RollingStepperProps {
  id?: string;
  label?: string;
  value?: number;
  onChange: (value: number | undefined) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
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
  className?: string;
}

export const RollingStepper: React.FC<RollingStepperProps> = ({
  id,
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  unit,
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
  className,
}) => {
  const generatedId = useId();
  const fieldId =
    id ?? (label ? `field-${label.toLowerCase().replace(/\s+/g, '-')}` : generatedId);
  const interactive = !disabled && !readOnly;
  const base = min ?? 0;
  const current = typeof value === 'number' && Number.isFinite(value) ? value : undefined;

  const clampVal = (v: number) => {
    let n = v;
    if (min !== undefined) n = Math.max(min, n);
    if (max !== undefined) n = Math.min(max, n);
    return roundTo(n);
  };

  const apply = (deltaSteps: number, multiplier = 1) => {
    if (!interactive) return false;
    const start = current ?? base;
    const next = clampVal(start + deltaSteps * step * multiplier);
    if (current !== undefined && next === current) return false;
    onChange(next);
    return !( (min !== undefined && next <= min) || (max !== undefined && next >= max) );
  };

  const minus = useHoldRepeat(() => apply(-1), { accelerate: true });
  const plus = useHoldRepeat(() => apply(1), { accelerate: true });

  const { onPointerDown } = useScrub({
    value: current ?? base,
    onChange: v => onChange(clampVal(v)),
    step,
    min: min ?? -Infinity,
    max: max ?? Infinity,
    disabled: !interactive,
  });

  // A drag ends with a trailing `click`; only a click without a drag should
  // swap in the NumberInput for exact typing.
  const dragMovedRef = useRef(false);
  const numberPointerDown = (e: React.PointerEvent) => {
    if (!interactive || e.detail > 1) return;
    dragMovedRef.current = false;
    const startX = e.clientX;
    const markMoved = (ev: PointerEvent) => {
      if (Math.abs(ev.clientX - startX) > 3) dragMovedRef.current = true;
    };
    const teardown = () => {
      window.removeEventListener('pointermove', markMoved);
      window.removeEventListener('pointerup', teardown);
      window.removeEventListener('pointercancel', teardown);
    };
    window.addEventListener('pointermove', markMoved);
    window.addEventListener('pointerup', teardown);
    window.addEventListener('pointercancel', teardown);
    onPointerDown(e);
  };

  const [editing, setEditing] = useState(false);
  useEffect(() => {
    if (!interactive) setEditing(false);
  }, [interactive]);

  const atMin = min !== undefined && (current ?? base) <= min && current !== undefined;
  const atMax = max !== undefined && (current ?? base) >= max && current !== undefined;

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!interactive || editing) return;
    const mult = e.shiftKey ? 10 : e.altKey ? 0.1 : 1;
    if (e.key === 'ArrowUp' || e.key === 'ArrowRight') {
      e.preventDefault();
      apply(1, mult);
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') {
      e.preventDefault();
      apply(-1, mult);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setEditing(true);
    }
  };

  const content = (
    <div className="inline-flex items-center gap-1 rounded-[var(--ne-radius-md)] border border-[var(--ne-border)] bg-[var(--ne-surface)] p-0.5">
      <button
        type="button"
        aria-label={label ? `Decrease ${label}` : 'Decrease'}
        disabled={!interactive || (atMin && current !== undefined)}
        className="inline-flex h-6 w-6 items-center justify-center rounded-[var(--ne-radius-sm)] text-[var(--ne-text-muted)] hover:bg-[var(--ne-surface-subtle)] hover:text-[var(--ne-text)] disabled:opacity-40 disabled:cursor-not-allowed"
        {...minus}
      >
        <Minus className="h-3 w-3" />
      </button>
      <div className="min-w-[3.5rem] px-1 text-center">
        {editing ? (
          <NumberInput
            id={fieldId}
            value={current ?? base}
            onChange={v => onChange(clampVal(v))}
            min={min}
            max={max}
            step={step}
            unit={unit ?? ''}
            disabled={!interactive}
            size="sm"
            className="w-20"
          />
        ) : (
          <button
            type="button"
            id={fieldId}
            className={cn(
              'w-full rounded px-1 py-0.5 text-xs font-mono tabular-nums text-[var(--ne-text)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--ne-focus-ring)]',
              interactive ? 'cursor-ew-resize' : 'cursor-default'
            )}
            onPointerDown={numberPointerDown}
            onClick={e => {
              if (!interactive) return;
              if (e.detail >= 1 && !e.defaultPrevented && !dragMovedRef.current)
                setEditing(true);
            }}
            onKeyDown={onKeyDown}
            disabled={!interactive}
            aria-label={label}
          >
            {current === undefined ? (
              <span className="text-[var(--ne-text-muted)]">—</span>
            ) : (
              <span className="inline-flex items-baseline gap-0.5 justify-center">
                <RollingNumber value={String(current)} />
                {unit ? <span className="text-[10px] text-[var(--ne-text-muted)]">{unit}</span> : null}
              </span>
            )}
          </button>
        )}
      </div>
      <button
        type="button"
        aria-label={label ? `Increase ${label}` : 'Increase'}
        disabled={!interactive || (atMax && current !== undefined)}
        className="inline-flex h-6 w-6 items-center justify-center rounded-[var(--ne-radius-sm)] text-[var(--ne-text-muted)] hover:bg-[var(--ne-surface-subtle)] hover:text-[var(--ne-text)] disabled:opacity-40 disabled:cursor-not-allowed"
        {...plus}
      >
        <Plus className="h-3 w-3" />
      </button>
      {editing && (
        <button
          type="button"
          className="ml-1 text-[10px] text-[var(--ne-text-muted)] hover:text-[var(--ne-text)]"
          onClick={() => setEditing(false)}
        >
          Done
        </button>
      )}
    </div>
  );

  if (!label) return <div className={className}>{content}</div>;

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
