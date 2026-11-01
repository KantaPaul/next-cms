/**
 * Visual style controls (R723 / UXE-13): a box-model widget for spacing,
 * alignment pads for flex and grid, draggable number inputs, unit switching,
 * and a design token picker in every color and size field. Values are written
 * through `onChange`, so the store records them as undoable commands.
 */

import {
  AlignmentPad,
  type AlignmentValue,
  BoxModelWidget,
  type BoxSpacing,
  COLOR_TOKENS as DEFAULT_COLOR_TOKENS,
  type DesignTokenOption as TokenOption,
  TokenPicker,
} from '@nextcms/editor-ui';
import type { CSSProperties } from 'react';
import { useState } from 'react';

export {
  AlignmentPad,
  AlignmentPad as AlignmentPads,
  type AlignmentValue,
  BoxModelWidget,
  type BoxSpacing,
  TokenPicker,
  type TokenOption,
  DEFAULT_COLOR_TOKENS,
};

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


