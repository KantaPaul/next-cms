'use client';

import { Minus, Plus } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  type Device,
  type Responsive,
  resolveResponsive,
  safeTrackList,
} from '../../style';
import { useCanvasDevice } from '../device-row';
import { useEditorBridge } from '../editor-bridge';
import { ControlLabel, Description } from '../primitives';

export const COLUMN_TRACK_PRESETS: readonly string[] = [
  '1fr 1fr',
  '1fr 2fr',
  'repeat(3, 1fr)',
  'repeat(4, 1fr)',
  'repeat(auto-fit, minmax(200px, 1fr))',
  '200px 200px 200px',
];

export const ROW_TRACK_PRESETS: readonly string[] = [
  'auto',
  '1fr 1fr',
  'repeat(2, 1fr)',
  'repeat(3, 1fr)',
  'auto 1fr auto',
];

const REPEAT_COUNT_RE = /^repeat\(\s*(\d+)\s*,\s*(.+)\s*\)$/i;

/** Counts tracks represented by a validated CSS track list (0 when empty). */
export function countTracks(trackList: string): number {
  const trimmed = trackList.trim();
  if (!trimmed) return 0;
  const repeat = REPEAT_COUNT_RE.exec(trimmed);
  if (repeat) return Math.max(1, Number(repeat[1]));
  // Split top-level whitespace tokens respecting nested parens.
  let count = 0;
  let depth = 0;
  let inToken = false;
  for (const ch of trimmed) {
    if (ch === '(') depth += 1;
    else if (ch === ')') depth = Math.max(0, depth - 1);
    if (depth === 0 && (ch === ' ' || ch === '\t')) {
      if (inToken) {
        count += 1;
        inToken = false;
      }
    } else {
      inToken = true;
    }
  }
  if (inToken) count += 1;
  return count;
}

/** Increments or decrements a track list count by 1 (1..12). */
export function stepTrackList(current: string, delta: 1 | -1): string {
  const trimmed = current.trim();
  if (!trimmed) {
    return delta > 0 ? '1fr' : '';
  }
  const repeat = REPEAT_COUNT_RE.exec(trimmed);
  if (repeat) {
    const nextCount = Math.min(12, Math.max(1, Number(repeat[1]) + delta));
    const inner = repeat[2].trim();
    if (nextCount === 1 && inner === '1fr') return '1fr';
    return `repeat(${nextCount}, ${inner})`;
  }
  const parts: string[] = [];
  let token = '';
  let depth = 0;
  for (const ch of trimmed) {
    if (ch === '(') depth += 1;
    else if (ch === ')') depth = Math.max(0, depth - 1);
    if (depth === 0 && (ch === ' ' || ch === '\t')) {
      if (token) {
        parts.push(token);
        token = '';
      }
    } else {
      token += ch;
    }
  }
  if (token) parts.push(token);
  if (delta > 0) {
    if (parts.length >= 12) return parts.join(' ');
    return [...parts, '1fr'].join(' ');
  }
  if (parts.length <= 1) return parts[0] ?? '1fr';
  return parts.slice(0, -1).join(' ');
}

/** Responsive track list input with count stepper, editable CSS track text, and presets. */
export function ResponsiveTrackInput({
  label,
  value,
  onChange,
  presets = COLUMN_TRACK_PRESETS,
  placeholder = 'e.g. repeat(3, 1fr)',
}: {
  label: string;
  value: Responsive<string> | undefined;
  onChange: (value: Responsive<string> | undefined) => void;
  presets?: readonly string[];
  placeholder?: string;
}) {
  const [device] = useCanvasDevice();
  const { breakpoints } = useEditorBridge();
  const isObject =
    typeof value === 'object' && value !== null && !Array.isArray(value);
  const currentDeviceVal = isObject
    ? (value as Record<Device, string>)[device]
    : undefined;
  const resolvedVal =
    resolveResponsive(value, device, safeTrackList, breakpoints) ?? '';
  const shownVal = currentDeviceVal ?? resolvedVal;
  const [draft, setDraft] = useState(shownVal);
  const [syncedVal, setSyncedVal] = useState(shownVal);
  if (syncedVal !== shownVal) {
    setSyncedVal(shownVal);
    setDraft(shownVal);
  }
  const hasOverride = currentDeviceVal !== undefined;
  const isInherited =
    !hasOverride && resolvedVal !== '' && device !== 'desktop';

  const resetOverride = () => {
    if (!isObject) return;
    const next = { ...(value as Record<Device, string>) };
    delete next[device];
    const remaining = Object.values(next).some(
      v => v !== undefined && v !== ''
    );
    onChange(remaining ? next : undefined);
  };

  const applyForDevice = (raw: string) => {
    const safe = safeTrackList(raw);
    if (safe === undefined) return;
    const base: Partial<Record<Device, string>> = isObject
      ? { ...(value as Record<Device, string>) }
      : {};
    onChange({ ...base, [device]: safe });
  };

  const commit = (nextVal: string) => {
    const trimmed = nextVal.trim();
    if (trimmed === shownVal.trim()) return;

    if (trimmed === '') {
      const base: Partial<Record<Device, string>> = isObject
        ? { ...(value as Record<Device, string>) }
        : {};
      delete base[device];
      const remaining = Object.values(base).some(
        v => v !== undefined && v !== ''
      );
      onChange(remaining ? base : undefined);
      return;
    }

    applyForDevice(trimmed);
  };

  const count = countTracks(shownVal);

  const aside = hasOverride ? (
    <button
      type="button"
      title={`Reset ${device} track override`}
      onClick={resetOverride}
      className="h-auto gap-0.5 px-1 py-0 text-[11px] text-primary hover:text-primary"
    >
      Reset
    </button>
  ) : isInherited ? (
    <span className="text-[10px] italic text-muted-foreground">Inherited</span>
  ) : null;

  return (
    <div className="space-y-1.5">
      <ControlLabel label={label} responsive>
        <div className="flex items-center gap-1.5">{aside}</div>
      </ControlLabel>
      <div className="flex items-center gap-1.5">
        <div className="flex h-8 shrink-0 items-center overflow-hidden rounded-md border border-input bg-background">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={`Remove ${label} track`}
            disabled={count <= 1}
            onClick={() => {
              const stepped = stepTrackList(shownVal, -1);
              if (stepped) applyForDevice(stepped);
            }}
            className="size-7 rounded-none px-0"
          >
            <Minus className="size-3" />
          </Button>
          <span
            className="min-w-6 px-1 text-center text-xs font-medium tabular-nums"
            title="Track count"
          >
            {count || '–'}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={`Add ${label} track`}
            disabled={count >= 12}
            onClick={() => {
              const stepped = stepTrackList(shownVal, 1);
              if (stepped) applyForDevice(stepped);
            }}
            className="size-7 rounded-none px-0"
          >
            <Plus className="size-3" />
          </Button>
        </div>
        <div className="flex h-8 min-w-0 flex-1 items-center rounded-md border border-input bg-background pr-2 focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50">
          <input
            type="text"
            value={draft}
            placeholder={placeholder}
            onChange={e => setDraft(e.target.value)}
            onBlur={e => commit(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && commit(e.currentTarget.value)}
            className="h-full w-full min-w-0 border-0 bg-transparent px-2 text-xs shadow-none focus-visible:ring-0"
          />
        </div>
      </div>
      <div className="flex flex-wrap gap-1">
        {presets.map(preset => (
          <button
            key={preset}
            type="button"
            title={`Use ${preset}`}
            onClick={() => applyForDevice(preset)}
            className="h-6 rounded border border-border bg-background px-1.5 text-[10px] text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            {preset}
          </button>
        ))}
      </div>
      <Description>
        Accepts px, rem, em, %, vw, fr, auto, min-content, max-content,
        fit-content(), repeat(), and minmax().
      </Description>
    </div>
  );
}
