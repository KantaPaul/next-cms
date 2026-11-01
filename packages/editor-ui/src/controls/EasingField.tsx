import React from 'react';
import { useId } from 'react';
import { cn } from '../lib/cn';
import { ControlRow } from './ControlRow';

export type EasingPreset =
  | 'linear'
  | 'ease'
  | 'ease-in'
  | 'ease-out'
  | 'ease-in-out'
  | 'spring'
  | 'bounce';

export interface EasingFieldProps {
  id?: string;
  label?: string;
  value?: string;
  onChange: (value: string) => void;
  info?: string;
  disabled?: boolean;
  className?: string;
}

export const EASING_PRESETS: {
  id: EasingPreset;
  label: string;
  css: string;
  svgPath: string;
}[] = [
  {
    id: 'linear',
    label: 'Linear',
    css: 'linear',
    svgPath: 'M 2 22 L 22 2',
  },
  {
    id: 'ease',
    label: 'Ease',
    css: 'ease',
    svgPath: 'M 2 22 C 6 22 8 2 22 2',
  },
  {
    id: 'ease-in',
    label: 'Ease In',
    css: 'ease-in',
    svgPath: 'M 2 22 C 12 22 18 12 22 2',
  },
  {
    id: 'ease-out',
    label: 'Ease Out',
    css: 'ease-out',
    svgPath: 'M 2 22 C 6 12 12 2 22 2',
  },
  {
    id: 'ease-in-out',
    label: 'Ease In-Out',
    css: 'ease-in-out',
    svgPath: 'M 2 22 C 10 22 14 2 22 2',
  },
  {
    id: 'spring',
    label: 'Spring',
    css: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
    svgPath: 'M 2 22 C 6 20 8 -4 16 2 C 19 5 21 2 22 2',
  },
  {
    id: 'bounce',
    label: 'Bounce',
    css: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    svgPath: 'M 2 22 C 6 28 8 2 14 -2 C 18 6 20 2 22 2',
  },
];

export function EasingField({
  id: explicitId,
  label = 'Easing Curve',
  value = 'ease-out',
  onChange,
  info,
  disabled = false,
  className,
}: EasingFieldProps) {
  const generatedId = useId();
  const id = explicitId ?? generatedId;

  return (
    <ControlRow
      htmlFor={id}
      label={label}
      info={info}
      className={className}
    >
      <div
        id={id}
        role="radiogroup"
        aria-label={label}
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 4,
          width: '100%',
        }}
      >
        {EASING_PRESETS.map(preset => {
          const isSelected = value === preset.id || value === preset.css;
          return (
            <button
              key={preset.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              disabled={disabled}
              onClick={() => onChange(preset.css)}
              title={`${preset.label} (${preset.css})`}
              className={cn(
                'group flex flex-col items-center justify-center p-1.5 rounded-md border text-xs transition-colors',
                isSelected
                  ? 'border-[var(--ne-primary,#4f46e5)] bg-[var(--ne-primary-soft,rgba(79,70,229,0.1))] text-[var(--ne-primary,#4f46e5)] font-semibold shadow-xs'
                  : 'border-[var(--ne-border,rgba(127,127,127,0.2))] bg-[var(--ne-surface,transparent)] text-[var(--ne-text-muted,#64748b)] hover:border-[var(--ne-border-strong,rgba(127,127,127,0.4))] hover:text-[var(--ne-text,inherit)]',
                disabled && 'opacity-50 cursor-not-allowed'
              )}
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="shrink-0 mb-1"
                aria-hidden="true"
              >
                {/* Background grid box */}
                <rect
                  x="1"
                  y="1"
                  width="22"
                  height="22"
                  rx="3"
                  className="stroke-[var(--ne-border-subtle,rgba(127,127,127,0.15))]"
                  strokeWidth="1"
                  strokeDasharray="2 2"
                />
                {/* Curve line */}
                <path
                  d={preset.svgPath}
                  className={cn(
                    'stroke-2 fill-none transition-colors',
                    isSelected
                      ? 'stroke-[var(--ne-primary,#4f46e5)]'
                      : 'stroke-[var(--ne-text-muted,#64748b)] group-hover:stroke-[var(--ne-text,#0f172a)]'
                  )}
                  strokeLinecap="round"
                />
              </svg>
              <span className="truncate max-w-full text-[10px] leading-tight">
                {preset.label}
              </span>
            </button>
          );
        })}
      </div>
    </ControlRow>
  );
}
