import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { cn } from '../lib/cn';
import { resolveMotionLevel } from '../lib/motion';
import { NumberInput } from '../primitives/NumberInput';
import { type ControlDeviceState, ControlRow } from './ControlRow';
import { clamp, decayWake, filledBarCount, tickPercent, wakeAmount } from './math';
import { useScrub } from './useScrub';

export interface WakeSliderProps {
  id?: string;
  label?: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  defaultValue?: number;
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

function prefersReduced(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

export const WakeSlider: React.FC<WakeSliderProps> = ({
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
  const bars = 40;

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

  const [wake, setWake] = useState(0);
  const lastRef = useRef<{ v: number; t: number } | null>(null);
  const rafRef = useRef<number | null>(null);
  const range = Math.max(max - min, 1);

  const motionLevel =
    typeof document !== 'undefined'
      ? resolveMotionLevel({
          motion: document.documentElement.dataset.neMotion as any,
          reducedMotion: prefersReduced(),
        })
      : 'full';
  const wakeEnabled = motionLevel === 'full';

  useEffect(() => {
    if (!wakeEnabled) return;
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const prev = lastRef.current;
    lastRef.current = { v: value, t: now };
    if (!prev) return;
    const amt = wakeAmount(value - prev.v, now - prev.t, range);
    if (amt > 0) setWake(w => Math.max(w, amt));
  }, [value, range, wakeEnabled]);

  useEffect(() => {
    if (!wakeEnabled || wake <= 0) {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      return;
    }
    let last = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const loop = (t: number) => {
      const dt = t - last;
      last = t;
      setWake(w => {
        const next = decayWake(w, dt);
        if (next <= 0) {
          rafRef.current = null;
          return 0;
        }
        rafRef.current = requestAnimationFrame(loop);
        return next;
      });
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [wake > 0, wakeEnabled]);

  const filled = filledBarCount(Number.isFinite(value) ? value : min, min, max, bars);

  const track = (
    <div
      className="relative flex-1 select-none"
      onDoubleClick={handleDoubleClick}
      title="Double-click to reset"
    >
      <div
        className="flex items-end gap-[2px]"
        style={{ height: size === 'sm' ? 14 : 18 }}
        aria-hidden="true"
      >
        {Array.from({ length: bars }).map((_, i) => {
          const isFilled = i < filled;
          const dist = Math.abs(i - filled);
          const boost = wakeEnabled ? Math.max(0, 1 - dist / 8) * wake : 0;
          const h = isFilled ? 100 : 45;
          return (
            <span
              key={i}
              className={cn(
                'flex-1 rounded-[1px] transition-[height,opacity,background-color] duration-[var(--ne-duration-fast)]',
                isFilled
                  ? 'bg-[var(--ne-primary)]'
                  : 'bg-[var(--ne-border-strong)]'
              )}
              style={{
                height: `${Math.min(100, h + boost * 45)}%`,
                opacity: isFilled ? 1 : 0.45 + boost * 0.25,
              }}
            />
          );
        })}
      </div>
      <input
        type="range"
        id={fieldId}
        min={min}
        max={max}
        step={step}
        value={Number.isFinite(value) ? value : min}
        onChange={e => {
          const next = parseFloat(e.target.value);
          if (!Number.isNaN(next)) onChange(clamp(next, min, max));
        }}
        disabled={!isInteractive}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
        aria-label={label}
      />
      {ticks && ticks.length > 0 && (
        <div className="pointer-events-none relative mt-1 h-1.5 w-full" aria-hidden="true">
          {ticks.map(tick => (
            <div
              key={tick}
              className="absolute top-0 -translate-x-1/2"
              style={{ insetInlineStart: `${tickPercent(tick, min, max)}%` }}
            >
              <div className="h-1 w-0.5 rounded-full bg-[var(--ne-border-strong)]" />
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const content = (
    <div className="flex items-center gap-2 w-full">
      {track}
      {showInput && (
        <NumberInput
          value={Number.isFinite(value) ? value : min}
          onChange={onChange}
          min={min}
          max={max}
          step={step}
          unit={unit ?? ''}
          disabled={!isInteractive}
          size="sm"
          className="w-16 shrink-0"
        />
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
      onLabelPointerDown={isInteractive ? onPointerDown : undefined}
      className={className}
    >
      {content}
    </ControlRow>
  );
};
