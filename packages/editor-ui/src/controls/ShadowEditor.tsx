import { Plus, Trash2 } from 'lucide-react';
import React from 'react';
import { useId, useState } from 'react';
import { cn } from '../lib/cn';
import { ColorField, type ColorToken } from './ColorField';
import { ControlRow } from './ControlRow';
import { NumberField } from './NumberField';

export interface ShadowItem {
  id?: string;
  x: number;
  y: number;
  blur: number;
  spread?: number;
  color: string;
  inset?: boolean;
}

export interface ShadowEditorProps {
  id?: string;
  type?: 'box' | 'text';
  value?: ShadowItem | ShadowItem[];
  onChange: (value: ShadowItem[]) => void;
  tokens?: readonly ColorToken[] | ColorToken[];
  label?: string;
  className?: string;
}

const DEFAULT_SHADOW: ShadowItem = {
  x: 0,
  y: 4,
  blur: 6,
  spread: 0,
  color: 'rgba(0, 0, 0, 0.15)',
  inset: false,
};

export const SHADOW_PRESETS: Array<{ label: string; shadow: ShadowItem }> = [
  {
    label: 'Subtle',
    shadow: { x: 0, y: 1, blur: 2, spread: 0, color: 'rgba(0, 0, 0, 0.05)', inset: false },
  },
  {
    label: 'Medium',
    shadow: { x: 0, y: 4, blur: 6, spread: -1, color: 'rgba(0, 0, 0, 0.1)', inset: false },
  },
  {
    label: 'Elevated',
    shadow: { x: 0, y: 10, blur: 15, spread: -3, color: 'rgba(0, 0, 0, 0.12)', inset: false },
  },
  {
    label: 'Floating',
    shadow: { x: 0, y: 20, blur: 25, spread: -5, color: 'rgba(0, 0, 0, 0.15)', inset: false },
  },
  {
    label: 'Inset',
    shadow: { x: 0, y: 2, blur: 4, spread: 0, color: 'rgba(0, 0, 0, 0.12)', inset: true },
  },
];

export const ShadowEditor: React.FC<ShadowEditorProps> = ({
  id,
  type = 'box',
  value,
  onChange,
  tokens,
  label,
  className,
}) => {
  const generatedId = useId();
  const rootId = id || generatedId;

  // Normalize value into an array of shadows
  const shadows: ShadowItem[] = Array.isArray(value)
    ? value
    : value
      ? [value]
      : [DEFAULT_SHADOW];

  const [activeIndex, setActiveIndex] = useState<number>(0);
  const current = shadows[activeIndex] || shadows[0] || DEFAULT_SHADOW;

  const updateCurrent = (patch: Partial<ShadowItem>) => {
    const updated = [...shadows];
    const targetIdx = Math.min(activeIndex, updated.length - 1);
    updated[targetIdx] = { ...current, ...patch };
    onChange(updated);
  };

  const addShadow = () => {
    const nextItem: ShadowItem = {
      x: 0,
      y: 8,
      blur: 12,
      spread: 0,
      color: 'rgba(0, 0, 0, 0.15)',
      inset: false,
    };
    const nextList = [...shadows, nextItem];
    onChange(nextList);
    setActiveIndex(nextList.length - 1);
  };

  const removeShadow = (indexToRemove: number) => {
    if (shadows.length <= 1) return;
    const nextList = shadows.filter((_, idx) => idx !== indexToRemove);
    onChange(nextList);
    setActiveIndex(Math.max(0, activeIndex - 1));
  };

  // Build CSS string for the mini-preview
  const previewCss = shadows
    .map(s => {
      const parts: string[] = [];
      if (type === 'box' && s.inset) parts.push('inset');
      parts.push(`${s.x}px ${s.y}px ${s.blur}px`);
      if (type === 'box' && s.spread !== undefined) parts.push(`${s.spread}px`);
      parts.push(s.color);
      return parts.join(' ');
    })
    .join(', ');

  const content = (
    <div
      id={rootId}
      className={cn('flex flex-col gap-3', className)}
      style={{ font: 'var(--ne-text-body, 13px/1.4 system-ui, sans-serif)' }}
    >
      {/* Live Preview Box & Shadow Layers list */}
      <div className="flex items-center gap-3">
        <div
          role="img"
          aria-label="Shadow preview"
          className="w-12 h-12 rounded-md flex items-center justify-center shrink-0 border border-[var(--ne-border)] transition-shadow"
          style={{
            backgroundColor: 'var(--ne-surface)',
            ...(type === 'box'
              ? { boxShadow: previewCss }
              : {}),
          }}
        >
          {type === 'text' && (
            <span
              className="text-lg font-bold"
              style={{
                textShadow: previewCss,
                color: 'var(--ne-text)',
              }}
            >
              Abc
            </span>
          )}
        </div>

        {/* Shadow layers selector */}
        <div className="flex-1 flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[var(--ne-text-muted)] uppercase tracking-wider">
              {type === 'box' ? 'Box Shadow' : 'Text Shadow'} ({shadows.length})
            </span>
            <button
              type="button"
              aria-label="Add shadow layer"
              onClick={addShadow}
              className="inline-flex items-center gap-1 text-xs text-[var(--ne-primary)] hover:underline"
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              <Plus size={13} />
              Add
            </button>
          </div>

          <div className="flex items-center gap-1 overflow-x-auto py-1">
            {shadows.map((s, idx) => (
              <button
                key={s.id || idx}
                type="button"
                aria-pressed={idx === activeIndex}
                onClick={() => setActiveIndex(idx)}
                className={cn(
                  'px-2 py-0.5 rounded text-xs font-medium transition-colors border',
                  idx === activeIndex
                    ? 'bg-[var(--ne-primary-soft)] text-[var(--ne-primary)] border-[var(--ne-primary)]'
                    : 'bg-[var(--ne-surface)] text-[var(--ne-text-muted)] border-[var(--ne-border)] hover:bg-[var(--ne-surface-hover)]'
                )}
              >
                Layer {idx + 1}
              </button>
            ))}
            {shadows.length > 1 && (
              <button
                type="button"
                aria-label="Remove active layer"
                title="Remove active layer"
                onClick={() => removeShadow(activeIndex)}
                className="p-1 rounded text-[var(--ne-text-muted)] hover:text-[var(--ne-danger)] hover:bg-[var(--ne-surface-hover)] transition-colors"
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Quick Presets */}
      <div className="flex flex-col gap-1">
        <span className="text-[11px] font-semibold text-[var(--ne-text-muted)] uppercase tracking-wider">
          Presets
        </span>
        <div className="flex items-center gap-1 overflow-x-auto">
          {SHADOW_PRESETS.map(p => (
            <button
              key={p.label}
              type="button"
              onClick={() => onChange([p.shadow])}
              className="px-2 py-1 rounded text-xs font-medium bg-[var(--ne-surface)] hover:bg-[var(--ne-surface-hover)] text-[var(--ne-text)] border border-[var(--ne-border)] transition-colors"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Axis Offsets */}
      <div className="grid grid-cols-2 gap-2">
        <NumberField
          label="X Offset"
          value={current.x}
          onChange={val => updateCurrent({ x: val })}
          min={-100}
          max={100}
          step={1}
        />
        <NumberField
          label="Y Offset"
          value={current.y}
          onChange={val => updateCurrent({ y: val })}
          min={-100}
          max={100}
          step={1}
        />
      </div>

      {/* Blur & Spread */}
      <div className="grid grid-cols-2 gap-2">
        <NumberField
          label="Blur"
          value={current.blur}
          onChange={val => updateCurrent({ blur: Math.max(0, val) })}
          min={0}
          max={100}
          step={1}
        />
        {type === 'box' && (
          <NumberField
            label="Spread"
            value={current.spread ?? 0}
            onChange={val => updateCurrent({ spread: val })}
            min={-50}
            max={100}
            step={1}
          />
        )}
      </div>

      {/* Color Picker */}
      <ColorField
        label="Shadow Color"
        value={current.color}
        onChange={val => updateCurrent({ color: val })}
        tokens={tokens}
      />

      {/* Inset Switch (for box shadow only) */}
      {type === 'box' && (
        <div className="flex items-center justify-between pt-1 border-t border-[var(--ne-border)]">
          <span className="text-xs font-medium text-[var(--ne-text)]">Inset Shadow</span>
          <div className="flex items-center rounded border border-[var(--ne-border)] overflow-hidden">
            <button
              type="button"
              aria-pressed={!current.inset}
              onClick={() => updateCurrent({ inset: false })}
              className={cn(
                'px-2.5 py-1 text-xs font-medium transition-colors',
                !current.inset
                  ? 'bg-[var(--ne-primary-soft)] text-[var(--ne-primary)]'
                  : 'bg-[var(--ne-surface)] text-[var(--ne-text-muted)] hover:bg-[var(--ne-surface-hover)]'
              )}
              style={{ border: 'none', cursor: 'pointer' }}
            >
              Outset
            </button>
            <button
              type="button"
              aria-pressed={!!current.inset}
              onClick={() => updateCurrent({ inset: true })}
              className={cn(
                'px-2.5 py-1 text-xs font-medium transition-colors',
                current.inset
                  ? 'bg-[var(--ne-primary-soft)] text-[var(--ne-primary)]'
                  : 'bg-[var(--ne-surface)] text-[var(--ne-text-muted)] hover:bg-[var(--ne-surface-hover)]'
              )}
              style={{ border: 'none', cursor: 'pointer' }}
            >
              Inset
            </button>
          </div>
        </div>
      )}
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
