/**
 * Visual style controls (R723 / UXE-13): a box-model widget for spacing,
 * alignment pads for flex and grid, draggable number inputs, unit switching,
 * and a design token picker in every color and size field. Values are written
 * through `onChange`, so the store records them as undoable commands.
 */

import type { CSSProperties } from 'react';
import { useState } from 'react';

const ACCENT = '#4f46e5';

export type Unit = 'px' | '%' | 'em' | 'rem' | 'vh' | 'vw';

export const UNITS: Unit[] = ['px', '%', 'em', 'rem', 'vh', 'vw'];

export type SizeValue = { value: number; unit: Unit };

export function parseSize(value: string | number | undefined): SizeValue | null {
  if (value === undefined || value === null || value === '') return null;
  const str = typeof value === 'number' ? `${value}px` : String(value);
  const match = str.match(/^(-?\d+(?:\.\d+)?)(px|%|em|rem|vh|vw)$/);
  if (!match) return null;
  return { value: Number(match[1]), unit: match[2] as Unit };
}

export function formatSize(size: SizeValue | null): string {
  if (!size) return '';
  return `${size.value}${size.unit}`;
}

/** A number input you can drag to change (R723). Shift for bigger steps. */
export function DraggableNumber({
  value,
  onChange,
  unit,
  step = 1,
  min,
  max,
  readOnly,
  label,
}: {
  value: number | undefined;
  onChange: (next: number) => void;
  unit?: Unit;
  step?: number;
  min?: number;
  max?: number;
  readOnly?: boolean;
  label?: string;
}) {
  const [dragging, setDragging] = useState(false);
  const [live, setLive] = useState<number | null>(null);

  const current = live ?? value ?? 0;
  const shown = unit ? `${current}${unit}` : String(current);

  const onPointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
    const start = current;
    const originX = event.clientX;
    const onMove = (move: globalThis.PointerEvent) => {
      const delta = move.clientX - originX;
      const stepSize = step * (move.shiftKey ? 10 : 1);
      let next = start + delta * stepSize * 0.1;
      if (min !== undefined) next = Math.max(min, next);
      if (max !== undefined) next = Math.min(max, next);
      setLive(Math.round(next * 100) / 100);
    };
    const finish = (cancel: boolean) => {
      event.currentTarget.releasePointerCapture(event.pointerId);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onCancel);
      setDragging(false);
      if (!cancel && live !== null) {
        onChange(live);
        setLive(null);
      }
    };
    const onUp = () => finish(false);
    const onCancel = () => finish(true);
    const onKey = (key: globalThis.KeyboardEvent) => {
      if (key.key !== 'Escape') return;
      key.preventDefault();
      key.stopPropagation();
      finish(true);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onCancel);
    window.addEventListener('keydown', onKey, true);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault();
      const stepSize = step * (event.shiftKey ? 10 : 1);
      const delta = event.key === 'ArrowUp' ? stepSize : -stepSize;
      let next = current + delta;
      if (min !== undefined) next = Math.max(min, next);
      if (max !== undefined) next = Math.min(max, next);
      onChange(Math.round(next * 100) / 100);
    }
  };

  const onChangeText = (event: React.ChangeEvent<HTMLInputElement>) => {
    const parsed = parseSize(event.target.value);
    if (parsed) onChange(parsed.value);
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        font: '13px/1.4 system-ui, sans-serif',
      }}
    >
      {label && <span style={{ opacity: 0.7, minWidth: 70 }}>{label}</span>}
      <button
        type="button"
        role="slider"
        aria-label={label ?? 'Adjust value'}
        aria-valuenow={current}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuetext={shown}
        title="Drag to change. Arrow keys, Shift for bigger steps. Escape cancels."
        onPointerDown={onPointerDown}
        style={{
          all: 'unset',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 20,
          height: 20,
          borderRadius: 3,
          background: dragging ? 'rgba(79,70,229,.15)' : 'transparent',
          border: `1px solid ${dragging ? '#4f46e5' : 'rgba(127,127,127,.35)'}`,
          cursor: 'ew-resize',
          userSelect: 'none',
          touchAction: 'none',
        }}
      >
        ⠇
      </button>
      <input
        type="text"
        value={shown}
        readOnly={readOnly}
        onChange={onChangeText}
        onKeyDown={onKeyDown}
        style={{
          width: 55,
          padding: '2px 6px',
          borderRadius: 4,
          border: `1px solid ${readOnly ? 'transparent' : 'rgba(127,127,127,.35)'}`,
          background: readOnly ? 'rgba(127,127,127,.1)' : 'transparent',
          color: 'inherit',
          font: '13px/1.4 system-ui, sans-serif',
        }}
      />
      {unit && (
        <select
          value={unit}
          onChange={event => {
            const next = event.target.value as Unit;
            if (UNITS.includes(next)) {
              // Keep the numeric value, switch the unit.
              onChange(current);
            }
          }}
          style={{
            padding: '2px 6px',
            borderRadius: 4,
            border: '1px solid rgba(127,127,127,.35)',
            background: 'transparent',
            color: 'inherit',
            font: '12px/1.4 system-ui, sans-serif',
          }}
        >
          {UNITS.map(u => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}

/** The CSS box model: margin, border, padding around a content box. */
export type BoxSides = { top: SizeValue; right: SizeValue; bottom: SizeValue; left: SizeValue };
export type BoxModelValue = { margin: BoxSides; padding: BoxSides; border: BoxSides };

const defaultSide = (unit: Unit = 'px'): BoxSides => ({ top: { value: 0, unit }, right: { value: 0, unit }, bottom: { value: 0, unit }, left: { value: 0, unit } });

export function BoxModelWidget({
  value,
  onChange,
  label = 'Spacing',
}: {
  value: BoxModelValue | undefined;
  onChange: (next: BoxModelValue) => void;
  label?: string;
}) {
  const [linked, setLinked] = useState(true);
  const sides = ['top', 'right', 'bottom', 'left'] as const;

  const sideInput = (which: 'margin' | 'padding' | 'border', side: string, sideValue: SizeValue) => {
    return (
      <DraggableNumber
        value={sideValue.value}
        unit={sideValue.unit}
        step={1}
        min={0}
        label={side[0].toUpperCase() + side.slice(1)}
        onChange={next => {
          onChange({
            ...value!,
            [which]: { ...value![which], [side]: { value: next, unit: sideValue.unit } },
          });
        }}
      />
    );
  };

  const allInput = (which: 'margin' | 'padding' | 'border', allValue: SizeValue) => (
    <DraggableNumber
      key={which}
      value={allValue.value}
      unit={allValue.unit}
      step={1}
      min={0}
      label={which === 'margin' ? 'Margin' : which === 'padding' ? 'Padding' : 'Border'}
      onChange={next => {
        const sides: BoxSides = { top: { value: next, unit: allValue.unit }, right: { value: next, unit: allValue.unit }, bottom: { value: next, unit: allValue.unit }, left: { value: next, unit: allValue.unit } };
        onChange({ ...value!, [which]: sides });
      }}
    />
  );

  return (
    <div style={{ display: 'grid', gap: 10, font: '13px/1.4 system-ui, sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, font: '600 12px/1.4 system-ui, sans-serif' }}>
        {label}
        <span style={{ opacity: 0.6, fontSize: 11 }}>{linked ? 'linked sides' : 'independent sides'}</span>
        <button
          type="button"
          aria-pressed={linked}
          onClick={() => setLinked(l => !l)}
          style={{
            all: 'unset',
            cursor: 'pointer',
            padding: '1px 6px',
            borderRadius: 4,
            border: '1px solid rgba(127,127,127,.35)',
            background: linked ? 'rgba(79,70,229,.15)' : 'transparent',
            color: 'inherit',
            font: '11px/1.4 system-ui, sans-serif',
          }}
        >
          {linked ? 'Unlink' : 'Link'}
        </button>
      </div>
      {(['margin', 'padding', 'border'] as const).map(which => (
        <div key={which} style={{ display: 'grid', gap: 8, marginTop: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ font: '600 11px/1.4 system-ui, sans-serif', opacity: 0.7, minWidth: 55 }}>{which === 'margin' ? 'Margin' : which === 'padding' ? 'Padding' : 'Border'}</span>
            {linked ? (
              allInput(which, value![which].top)
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                {sides.map(side => sideInput(which, side, value![which][side]))}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Alignment pads for flex and grid: justify-content and align-items. */
export type AlignmentValue = { justify: 'start' | 'center' | 'end' | 'space-between' | 'space-around'; align: 'start' | 'center' | 'end' | 'stretch' };

const ALIGN_LABELS: Record<string, string> = { start: 'Start', center: 'Center', end: 'End', 'space-between': 'Space between', 'space-around': 'Space around', stretch: 'Stretch' };

export function AlignmentPads({
  value,
  onChange,
}: {
  value: AlignmentValue | undefined;
  onChange: (next: AlignmentValue) => void;
}) {
  const justifyOptions: { value: AlignmentValue['justify']; label: string }[] = [
    { value: 'start', label: 'Start' },
    { value: 'center', label: 'Center' },
    { value: 'end', label: 'End' },
    { value: 'space-between', label: 'Space between' },
    { value: 'space-around', label: 'Space around' },
  ];
  const alignOptions: { value: AlignmentValue['align']; label: string }[] = [
    { value: 'start', label: 'Start' },
    { value: 'center', label: 'Center' },
    { value: 'end', label: 'End' },
    { value: 'stretch', label: 'Stretch' },
  ];

  return (
    <div style={{ display: 'grid', gap: 10, font: '13px/1.4 system-ui, sans-serif' }}>
      <div>
        <div style={{ font: '600 11px/1.4 system-ui, sans-serif', opacity: 0.7, marginBottom: 6 }}>Justify content</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}>
          {justifyOptions.map(opt => (
            <button
              key={opt.value}
              type="button"
              aria-pressed={value?.justify === opt.value}
              onClick={() => onChange({ ...value!, justify: opt.value })}
              style={{
                all: 'unset',
                padding: '8px 4px',
                borderRadius: 6,
                border: `1px solid ${value?.justify === opt.value ? '#4f46e5' : 'rgba(127,127,127,.35)'}`,
                background: value?.justify === opt.value ? 'rgba(79,70,229,.15)' : 'transparent',
                color: 'inherit',
                font: '600 11px/1.4 system-ui, sans-serif',
                cursor: 'pointer',
              }}
            >
              {ALIGN_LABELS[opt.value]}
            </button>
          ))}
        </div>
      </div>
      <div>
        <div style={{ font: '600 11px/1.4 system-ui, sans-serif', opacity: 0.7, marginBottom: 6 }}>Align items</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 4 }}>
          {alignOptions.map(opt => (
            <button
              key={opt.value}
              type="button"
              aria-pressed={value?.align === opt.value}
              onClick={() => onChange({ ...value!, align: opt.value })}
              style={{
                all: 'unset',
                padding: '8px 4px',
                borderRadius: 6,
                border: `1px solid ${value?.align === opt.value ? '#4f46e5' : 'rgba(127,127,127,.35)'}`,
                background: value?.align === opt.value ? 'rgba(79,70,229,.15)' : 'transparent',
                color: 'inherit',
                font: '600 11px/1.4 system-ui, sans-serif',
                cursor: 'pointer',
              }}
            >
              {ALIGN_LABELS[opt.value]}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/** A design token picker: choose from the site's theme tokens. */
export type TokenOption = { value: string; label: string; color?: string };

export function TokenPicker({
  value,
  onChange,
  tokens,
  label = 'Token',
}: {
  value: string | undefined;
  onChange: (next: string | undefined) => void;
  tokens: TokenOption[];
  label?: string;
}) {
  return (
    <div style={{ display: 'grid', gap: 6, font: '13px/1.4 system-ui, sans-serif' }}>
      <label style={{ font: '600 12px/1.4 system-ui, sans-serif' }}>{label}</label>
      <select
        value={value ?? ''}
        onChange={event => onChange(event.target.value || undefined)}
        style={{
          width: '100%',
          padding: '6px 8px',
          borderRadius: 6,
          border: '1px solid rgba(127,127,127,.35)',
          background: 'transparent',
          color: 'inherit',
          font: '13px/1.4 system-ui, sans-serif',
        }}
      >
        <option value="">Inherit token</option>
        {tokens.map(token => (
          <option key={token.value} value={token.value} style={{ color: token.color ?? 'inherit' }}>
            {token.label}
          </option>
        ))}
      </select>
    </div>
  );
}
