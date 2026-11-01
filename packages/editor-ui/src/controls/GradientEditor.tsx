import { Plus, Trash2 } from 'lucide-react';
import React from 'react';
import { useId, useState } from 'react';
import { cn } from '../lib/cn';
import { ChooseField } from './ChooseField';
import { ColorField, type ColorToken } from './ColorField';
import { ControlRow } from './ControlRow';
import { NumberField } from './NumberField';
import { SliderField } from './SliderField';

export interface GradientStop {
  id?: string;
  color: string;
  offset: number; // 0 to 100
}

export interface GradientConfig {
  type?: 'linear' | 'radial';
  angle?: number; // 0 to 360 deg
  stops: GradientStop[];
}

export interface GradientEditorProps {
  id?: string;
  value?: GradientConfig;
  onChange: (next: GradientConfig) => void;
  tokens?: readonly ColorToken[] | ColorToken[];
  label?: string;
  className?: string;
}

const DEFAULT_CONFIG: GradientConfig = {
  type: 'linear',
  angle: 90,
  stops: [
    { color: '#3b82f6', offset: 0 },
    { color: '#8b5cf6', offset: 100 },
  ],
};

export const GRADIENT_PRESETS: Array<{ label: string; config: GradientConfig }> = [
  {
    label: 'Sunset',
    config: {
      type: 'linear',
      angle: 90,
      stops: [
        { color: '#f97316', offset: 0 },
        { color: '#ec4899', offset: 100 },
      ],
    },
  },
  {
    label: 'Ocean',
    config: {
      type: 'linear',
      angle: 135,
      stops: [
        { color: '#06b6d4', offset: 0 },
        { color: '#3b82f6', offset: 100 },
      ],
    },
  },
  {
    label: 'Aurora',
    config: {
      type: 'linear',
      angle: 90,
      stops: [
        { color: '#10b981', offset: 0 },
        { color: '#6366f1', offset: 100 },
      ],
    },
  },
  {
    label: 'Midnight',
    config: {
      type: 'linear',
      angle: 180,
      stops: [
        { color: '#1e1b4b', offset: 0 },
        { color: '#4338ca', offset: 100 },
      ],
    },
  },
];

export const GradientEditor: React.FC<GradientEditorProps> = ({
  id,
  value = DEFAULT_CONFIG,
  onChange,
  tokens,
  label,
  className,
}) => {
  const generatedId = useId();
  const rootId = id || generatedId;

  const type = value.type || 'linear';
  const angle = value.angle ?? 90;
  const stops = value.stops && value.stops.length > 0 ? value.stops : DEFAULT_CONFIG.stops;

  const [activeStopIndex, setActiveStopIndex] = useState<number>(0);
  const activeStop = stops[activeStopIndex] || stops[0];

  const sortedStops = [...stops].sort((a, b) => a.offset - b.offset);
  const gradientCss = sortedStops.map(s => `${s.color} ${s.offset}%`).join(', ');

  const previewGradient =
    type === 'radial'
      ? `radial-gradient(circle, ${gradientCss})`
      : `linear-gradient(${angle}deg, ${gradientCss})`;

  const updateStop = (index: number, patch: Partial<GradientStop>) => {
    const nextStops = [...stops];
    nextStops[index] = { ...nextStops[index], ...patch };
    onChange({ ...value, stops: nextStops });
  };

  const addStop = (atOffset = 50) => {
    const newStop: GradientStop = {
      color: activeStop.color || '#3b82f6',
      offset: atOffset,
    };
    const nextStops = [...stops, newStop].sort((a, b) => a.offset - b.offset);
    const newIdx = nextStops.indexOf(newStop);
    onChange({ ...value, stops: nextStops });
    setActiveStopIndex(newIdx >= 0 ? newIdx : nextStops.length - 1);
  };

  const removeStop = (indexToRemove: number) => {
    if (stops.length <= 2) return;
    const nextStops = stops.filter((_, idx) => idx !== indexToRemove);
    onChange({ ...value, stops: nextStops });
    setActiveStopIndex(Math.max(0, activeStopIndex - 1));
  };

  const content = (
    <div
      id={rootId}
      className={cn('flex flex-col gap-3', className)}
      style={{ font: 'var(--ne-text-body, 13px/1.4 system-ui, sans-serif)' }}
    >
      {/* Type & Angle */}
      <div className="flex items-center gap-2">
        <div className="w-1/2">
          <ChooseField
            value={type}
            onChange={val => onChange({ ...value, type: val as 'linear' | 'radial' })}
            options={[
              { value: 'linear', label: 'Linear' },
              { value: 'radial', label: 'Radial' },
            ]}
          />
        </div>
        {type === 'linear' && (
          <div className="w-1/2">
            <SliderField
              value={angle}
              onChange={val => onChange({ ...value, angle: val })}
              min={0}
              max={360}
              step={1}
              unit="°"
              defaultValue={90}
            />
          </div>
        )}
      </div>

      {/* Interactive Gradient Track */}
      <div className="flex flex-col gap-1.5">
        <div
          role="img"
          aria-label="Gradient track preview"
          className="relative h-8 rounded-md border border-[var(--ne-border)] cursor-pointer"
          style={{ backgroundImage: `linear-gradient(90deg, ${gradientCss})` }}
          onClick={e => {
            const rect = e.currentTarget.getBoundingClientRect();
            const clickPercent = Math.round(
              Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100))
            );
            addStop(clickPercent);
          }}
        >
          {stops.map((stop, idx) => {
            const isSelected = idx === activeStopIndex;
            return (
              <button
                key={stop.id || idx}
                type="button"
                aria-label={`Stop ${idx + 1} at ${stop.offset}%`}
                aria-pressed={isSelected}
                onClick={e => {
                  e.stopPropagation();
                  setActiveStopIndex(idx);
                }}
                className={cn(
                  'absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-6 rounded border-2 transition-transform shadow-md',
                  isSelected
                    ? 'border-white ring-2 ring-[var(--ne-primary)] scale-110 z-10'
                    : 'border-white/80 hover:scale-105 z-0'
                )}
                style={{
                  left: `${stop.offset}%`,
                  backgroundColor: stop.color,
                  cursor: 'pointer',
                  padding: 0,
                }}
              />
            );
          })}
        </div>
        <span className="text-[10px] text-[var(--ne-text-muted)] text-center">
          Click track to add stop. Click pin to edit.
        </span>
      </div>

      {/* Selected Stop Controls */}
      <div className="flex items-center gap-2 p-2 rounded-md bg-[var(--ne-surface-subtle)] border border-[var(--ne-border)]">
        <div className="flex-1">
          <ColorField
            value={activeStop.color}
            onChange={col => updateStop(activeStopIndex, { color: col })}
            tokens={tokens}
          />
        </div>
        <div className="w-24">
          <NumberField
            value={activeStop.offset}
            onChange={off => updateStop(activeStopIndex, { offset: Math.max(0, Math.min(100, off)) })}
            min={0}
            max={100}
            step={1}
            unit="%"
          />
        </div>
        {stops.length > 2 && (
          <button
            type="button"
            aria-label="Remove stop"
            title="Remove stop"
            onClick={() => removeStop(activeStopIndex)}
            className="p-1.5 rounded text-[var(--ne-text-muted)] hover:text-[var(--ne-danger)] hover:bg-[var(--ne-surface-hover)] transition-colors"
            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>

      {/* Presets */}
      <div className="flex flex-col gap-1">
        <span className="text-[11px] font-semibold text-[var(--ne-text-muted)] uppercase tracking-wider">
          Presets
        </span>
        <div className="flex items-center gap-1 overflow-x-auto">
          {GRADIENT_PRESETS.map(p => (
            <button
              key={p.label}
              type="button"
              onClick={() => onChange(p.config)}
              className="px-2 py-1 rounded text-xs font-medium bg-[var(--ne-surface)] hover:bg-[var(--ne-surface-hover)] text-[var(--ne-text)] border border-[var(--ne-border)] transition-colors"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  if (label) {
    return (
      <ControlRow label={label} htmlFor={rootId}>
        {content}
      </ControlRow>
    );
  }

  return content;
};
