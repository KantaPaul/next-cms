import React from 'react';
import { forwardRef } from 'react';
import { clamp as clampTo } from '../controls/math';
import { useScrub } from '../controls/useScrub';

export interface NumberInputProps {
  id?: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  label?: string;
  disabled?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const NumberInput = forwardRef<HTMLInputElement, NumberInputProps>(
  (
    {
      id,
      value,
      onChange,
      min = -Infinity,
      max = Infinity,
      step = 1,
      unit = 'px',
      label,
      disabled = false,
      className = '',
      size = 'md',
    },
    ref
  ) => {
    const clamp = (val: number) => clampTo(val, min, max);
    // Holding Shift speeds up by 10x, Alt slows down to 0.1x
    const { isScrubbing, onPointerDown } = useScrub({
      value,
      onChange,
      step,
      min,
      max,
      disabled,
    });

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (disabled) return;
      const multiplier = e.shiftKey ? 10 : 1;
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        onChange(clamp(value + step * multiplier));
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        onChange(clamp(value - step * multiplier));
      }
    };

    const heightClass = {
      sm: 'h-6 text-xs',
      md: 'h-7 text-xs', // 28px standard compact
      lg: 'h-8 text-sm',
    }[size];

    return (
      <div
        className={`relative flex items-center rounded-[var(--ne-radius-md)] border bg-[var(--ne-surface)] border-[var(--ne-border)] focus-within:border-[var(--ne-primary)] focus-within:ring-1 focus-within:ring-[var(--ne-primary)] transition-all ${
          disabled
            ? 'opacity-50 cursor-not-allowed bg-[var(--ne-surface-subtle)]'
            : ''
        } ${isScrubbing ? 'ring-2 ring-[var(--ne-primary)]' : ''} ${className}`}
      >
        {/* Scrub handle / Label */}
        <div
          onPointerDown={onPointerDown}
          title="Click and drag horizontally to scrub value"
          className={`px-2 flex items-center justify-center font-mono text-[11px] font-medium text-[var(--ne-text-muted)] select-none bg-[var(--ne-surface-subtle)] border-r border-[var(--ne-border)] transition-colors ${
            disabled
              ? 'cursor-not-allowed'
              : 'cursor-ew-resize hover:text-[var(--ne-primary)] hover:bg-[var(--ne-surface-hover)]'
          }`}
          style={{
            height: size === 'sm' ? '22px' : size === 'lg' ? '30px' : '26px',
          }}
        >
          {label ? (
            label
          ) : (
            <span className="flex items-center gap-0.5 tracking-tighter">
              ↔
            </span>
          )}
        </div>

        <input
          ref={ref}
          id={id}
          type="number"
          value={value}
          disabled={disabled}
          min={min}
          max={max}
          step={step}
          onChange={e => {
            const val = parseFloat(e.target.value);
            if (!isNaN(val)) {
              onChange(clamp(val));
            }
          }}
          onKeyDown={handleKeyDown}
          className={`w-full bg-transparent px-2 text-[var(--ne-text)] tabular-nums font-mono focus:outline-none disabled:cursor-not-allowed [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${heightClass}`}
        />

        {unit && (
          <span className="pr-2 text-[10px] uppercase font-mono tracking-wider text-[var(--ne-text-subtle)] select-none pointer-events-none">
            {unit}
          </span>
        )}
      </div>
    );
  }
);

NumberInput.displayName = 'NumberInput';
