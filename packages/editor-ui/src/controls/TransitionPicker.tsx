import { Play, Sparkles } from 'lucide-react';
import React, { useId, useState } from 'react';
import { cn } from '../lib/cn';
import { ControlRow } from './ControlRow';
import { EasingField } from './EasingField';
import { NumberField } from './NumberField';
import { SelectField } from './SelectField';
import { SliderField } from './SliderField';

export interface TransitionValue {
  property?: string;
  duration?: number; // in milliseconds
  timingFunction?: string;
  delay?: number; // in milliseconds
}

export interface TransitionPickerProps {
  id?: string;
  label?: string;
  value?: TransitionValue;
  onChange: (value: TransitionValue) => void;
  info?: string;
  disabled?: boolean;
  className?: string;
}

export const TRANSITION_PROPERTY_OPTIONS = [
  { value: 'all', label: 'All Properties' },
  { value: 'transform', label: 'Transform (Scale/Move)' },
  { value: 'opacity', label: 'Opacity' },
  { value: 'background-color', label: 'Background Color' },
  { value: 'color', label: 'Text Color' },
  { value: 'box-shadow', label: 'Shadow' },
  { value: 'border-color', label: 'Border Color' },
  { value: 'filter', label: 'Filter / Blur' },
];

export function TransitionPicker({
  id: explicitId,
  label = 'CSS Transition',
  value = {
    property: 'all',
    duration: 200,
    timingFunction: 'ease-out',
    delay: 0,
  },
  onChange,
  info,
  disabled = false,
  className,
}: TransitionPickerProps) {
  const generatedId = useId();
  const id = explicitId ?? generatedId;
  const [isPreviewActive, setIsPreviewActive] = useState(false);

  const duration = value.duration ?? 200;
  const delay = value.delay ?? 0;
  const timing = value.timingFunction ?? 'ease-out';
  const property = value.property ?? 'all';

  const transitionCss = `${property} ${duration}ms ${timing} ${delay}ms`;

  return (
    <div className={cn('flex flex-col gap-3', className)} id={id}>
      {/* Property Selector */}
      <SelectField
        label="Transition Property"
        value={property}
        options={TRANSITION_PROPERTY_OPTIONS}
        onChange={p => onChange({ ...value, property: p })}
        disabled={disabled}
      />

      {/* Duration Slider */}
      <SliderField
        label="Duration"
        value={duration}
        min={0}
        max={2000}
        step={50}
        unit="ms"
        ticks={[0, 200, 500, 1000, 2000]}
        defaultValue={200}
        onChange={d => onChange({ ...value, duration: d })}
        disabled={disabled}
      />

      {/* Delay Slider */}
      <SliderField
        label="Delay"
        value={delay}
        min={0}
        max={1000}
        step={50}
        unit="ms"
        ticks={[0, 200, 500, 1000]}
        defaultValue={0}
        onChange={d => onChange({ ...value, delay: d })}
        disabled={disabled}
      />

      {/* Timing Function */}
      <EasingField
        label="Timing Function"
        value={timing}
        onChange={t => onChange({ ...value, timingFunction: t })}
        disabled={disabled}
      />

      {/* Interactive Preview Swatch */}
      <div className="flex flex-col gap-1.5 pt-1">
        <div className="flex items-center justify-between text-[11px] text-[var(--ne-text-muted,#64748b)]">
          <span className="flex items-center gap-1 font-medium">
            <Sparkles size={11} className="text-[var(--ne-primary,#4f46e5)]" />
            Live Preview (Hover over box)
          </span>
          <code className="text-[10px] bg-[var(--ne-surface-active,rgba(127,127,127,0.1))] px-1 py-0.5 rounded truncate max-w-[140px]">
            {duration}ms {timing}
          </code>
        </div>

        <div
          role="region"
          aria-label="Transition preview box"
          onMouseEnter={() => setIsPreviewActive(true)}
          onMouseLeave={() => setIsPreviewActive(false)}
          className="relative flex items-center justify-center h-14 rounded-lg border border-dashed border-[var(--ne-border,rgba(127,127,127,0.3))] bg-[var(--ne-surface-muted,rgba(127,127,127,0.04))] cursor-pointer overflow-hidden select-none"
        >
          <div
            style={{
              transition: transitionCss,
              transform: isPreviewActive
                ? 'scale(1.15) translateY(-2px)'
                : 'scale(1) translateY(0)',
              backgroundColor: isPreviewActive
                ? 'var(--ne-primary, #4f46e5)'
                : 'var(--ne-surface-active, rgba(79, 70, 229, 0.15))',
              color: isPreviewActive ? '#ffffff' : 'var(--ne-primary, #4f46e5)',
              boxShadow: isPreviewActive
                ? '0 6px 16px -2px rgba(79, 70, 229, 0.4)'
                : 'none',
              borderRadius: isPreviewActive ? 12 : 6,
              opacity: isPreviewActive ? 1 : 0.85,
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold shadow-xs"
          >
            <Play size={12} fill="currentColor" />
            <span>Hover Me</span>
          </div>
        </div>
      </div>
    </div>
  );
}
