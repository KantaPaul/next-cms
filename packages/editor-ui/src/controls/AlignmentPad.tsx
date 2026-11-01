import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
} from 'lucide-react';
import React from 'react';
import { cn } from '../lib/cn';
import { ControlRow } from './ControlRow';

export type JustifyOption =
  | 'start'
  | 'center'
  | 'end'
  | 'space-between'
  | 'space-around'
  | 'space-evenly';

export type AlignOption = 'start' | 'center' | 'end' | 'stretch' | 'baseline';

export interface AlignmentValue {
  justify: JustifyOption;
  align: AlignOption;
}

export interface AlignmentPadProps {
  id?: string;
  value?: AlignmentValue;
  onChange: (next: AlignmentValue) => void;
  label?: string;
  showVisualPad?: boolean;
  className?: string;
}

const DEFAULT_VALUE: AlignmentValue = {
  justify: 'start',
  align: 'start',
};

const JUSTIFY_OPTIONS: Array<{ value: JustifyOption; label: string; icon?: React.ReactNode }> = [
  { value: 'start', label: 'Start' },
  { value: 'center', label: 'Center' },
  { value: 'end', label: 'End' },
  { value: 'space-between', label: 'Between' },
  { value: 'space-around', label: 'Around' },
  { value: 'space-evenly', label: 'Evenly' },
];

const ALIGN_OPTIONS: Array<{ value: AlignOption; label: string }> = [
  { value: 'start', label: 'Start' },
  { value: 'center', label: 'Center' },
  { value: 'end', label: 'End' },
  { value: 'stretch', label: 'Stretch' },
  { value: 'baseline', label: 'Baseline' },
];

const MATRIX_CELLS: Array<{ justify: JustifyOption; align: AlignOption; label: string }> = [
  { justify: 'start', align: 'start', label: 'Top Left' },
  { justify: 'center', align: 'start', label: 'Top Center' },
  { justify: 'end', align: 'start', label: 'Top Right' },
  { justify: 'start', align: 'center', label: 'Center Left' },
  { justify: 'center', align: 'center', label: 'Center' },
  { justify: 'end', align: 'center', label: 'Center Right' },
  { justify: 'start', align: 'end', label: 'Bottom Left' },
  { justify: 'center', align: 'end', label: 'Bottom Center' },
  { justify: 'end', align: 'end', label: 'Bottom Right' },
];

export const AlignmentPad: React.FC<AlignmentPadProps> = ({
  id,
  value = DEFAULT_VALUE,
  onChange,
  label,
  showVisualPad = true,
  className,
}) => {
  const currentJustify = value.justify || 'start';
  const currentAlign = value.align || 'start';

  const content = (
    <div
      id={id}
      className={cn('flex flex-col gap-3', className)}
      style={{ font: 'var(--ne-text-body, 13px/1.4 system-ui, sans-serif)' }}
    >
      {showVisualPad && (
        <div className="flex items-center gap-4">
          <div
            role="group"
            aria-label="Alignment grid"
            className="grid grid-cols-3 gap-1 p-1 rounded-md"
            style={{
              width: 84,
              height: 84,
              backgroundColor: 'var(--ne-surface-subtle)',
              border: '1px solid var(--ne-border)',
            }}
          >
            {MATRIX_CELLS.map(cell => {
              const isSelected =
                currentJustify === cell.justify && currentAlign === cell.align;

              return (
                <button
                  key={`${cell.justify}-${cell.align}`}
                  type="button"
                  aria-pressed={isSelected}
                  aria-label={cell.label}
                  title={cell.label}
                  onClick={() => onChange({ justify: cell.justify, align: cell.align })}
                  className={cn(
                    'flex items-center justify-center rounded transition-colors',
                    isSelected
                      ? 'bg-[var(--ne-primary)] text-white shadow-sm'
                      : 'hover:bg-[var(--ne-surface-hover)] text-[var(--ne-text-muted)]'
                  )}
                  style={{
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  <div
                    className={cn(
                      'w-2 h-2 rounded-full transition-transform',
                      isSelected ? 'bg-white scale-125' : 'bg-current opacity-40'
                    )}
                  />
                </button>
              );
            })}
          </div>

          <div className="flex flex-col gap-1 text-xs text-[var(--ne-text-muted)]">
            <span className="font-medium text-[var(--ne-text)]">
              {currentJustify} / {currentAlign}
            </span>
            <span>Click 3×3 pad to set both, or choose below.</span>
          </div>
        </div>
      )}

      {/* Justify Content */}
      <div className="flex flex-col gap-1">
        <span
          className="text-[11px] font-semibold text-[var(--ne-text-muted)] uppercase tracking-wider"
        >
          Justify Content
        </span>
        <div
          role="radiogroup"
          aria-label="Justify content"
          className="grid grid-cols-3 gap-1"
        >
          {JUSTIFY_OPTIONS.map(opt => {
            const isSelected = currentJustify === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => onChange({ ...value, justify: opt.value })}
                className={cn(
                  'h-7 px-2 text-xs font-medium rounded transition-colors flex items-center justify-center',
                  isSelected
                    ? 'bg-[var(--ne-primary-soft)] text-[var(--ne-primary)] border border-[var(--ne-primary)]'
                    : 'bg-[var(--ne-surface)] text-[var(--ne-text)] border border-[var(--ne-border)] hover:bg-[var(--ne-surface-hover)]'
                )}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Align Items */}
      <div className="flex flex-col gap-1">
        <span
          className="text-[11px] font-semibold text-[var(--ne-text-muted)] uppercase tracking-wider"
        >
          Align Items
        </span>
        <div
          role="radiogroup"
          aria-label="Align items"
          className="grid grid-cols-3 gap-1"
        >
          {ALIGN_OPTIONS.map(opt => {
            const isSelected = currentAlign === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => onChange({ ...value, align: opt.value })}
                className={cn(
                  'h-7 px-2 text-xs font-medium rounded transition-colors flex items-center justify-center',
                  isSelected
                    ? 'bg-[var(--ne-primary-soft)] text-[var(--ne-primary)] border border-[var(--ne-primary)]'
                    : 'bg-[var(--ne-surface)] text-[var(--ne-text)] border border-[var(--ne-border)] hover:bg-[var(--ne-surface-hover)]'
                )}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );

  if (label) {
    return (
      <ControlRow label={label} htmlFor={id}>
        {content}
      </ControlRow>
    );
  }

  return content;
};
