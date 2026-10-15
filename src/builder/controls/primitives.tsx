'use client';

import { ChevronDown, RotateCcw, X } from 'lucide-react';
import { useEffect, useId, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';
import { resolveResponsive, type Device, type MaybeResponsive } from '../style';
import { DeviceRow, useCanvasDevice } from './device-row';

export function ControlLabel({
  label,
  htmlFor,
  children,
  responsive,
  aside,
}: {
  label: string;
  htmlFor?: string;
  children?: ReactNode;
  responsive?: boolean;
  aside?: ReactNode;
}) {
  return (
    <div className="mb-1.5 flex min-h-5 items-center justify-between gap-2">
      <label htmlFor={htmlFor} className="text-xs font-medium text-steel-600">
        {label}
      </label>
      <div className="flex items-center gap-1.5">
        {responsive && <DeviceRow />}
        {aside ?? children}
      </div>
    </div>
  );
}

/** Collapsible inspector group, e.g. Colors, Typography, Border. */
export function Group({ title, defaultOpen = false, children }: { title: string; defaultOpen?: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();

  return (
    <div className="border-t border-steel-100 first:border-t-0">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center justify-between py-2.5 text-left text-sm font-medium text-steel-800"
      >
        {title}
        <ChevronDown className={cn('size-4 text-steel-400 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div id={id} className="space-y-4 pb-4">
          {children}
        </div>
      )}
    </div>
  );
}

export type ChooseOption<T extends string> = { value: T; label: string; icon?: ReactNode };

/** Segmented button row: gear-trader style (divide-x, rounded-sm, equal flex-1 cells). */
export function Choose<T extends string>({
  label,
  value,
  options,
  onChange,
  columns,
  aside,
  responsive,
  isInherited,
}: {
  label?: string;
  value: T | undefined;
  options: ChooseOption<T>[];
  onChange: (value: T) => void;
  columns?: number;
  aside?: ReactNode;
  responsive?: boolean;
  isInherited?: boolean;
}) {
  return (
    <div>
      {label && (
        <ControlLabel label={label} responsive={responsive}>
          {aside}
        </ControlLabel>
      )}

      <div
        role="radiogroup"
        aria-label={label}
        className={cn(
          'grid divide-x divide-steel-200 overflow-hidden rounded-sm border border-steel-200 bg-white text-xs',
          !columns && 'auto-cols-fr grid-flow-col',
          isInherited && 'opacity-65'
        )}
        style={columns ? { gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` } : undefined}
      >
        {options.map(option => {
          const selected = option.value === value;

          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={selected}
              title={option.label}
              aria-label={option.icon ? option.label : undefined}
              onClick={() => onChange(option.value)}
              className={cn(
                'flex min-h-8 items-center justify-center gap-1 px-1.5 py-1.5 transition-colors [&>svg]:size-4',
                selected ? 'bg-steel-100 font-medium text-steel-900' : 'text-steel-600 hover:bg-steel-50'
              )}
            >
              {option.icon ?? <span className="truncate">{option.label}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Range plus an editable number with gear-trader styling and optional unit select. */
export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  unit,
  units,
  placeholder,
  onChange,
  aside,
  responsive,
  isInherited,
}: {
  label: string;
  value: number | undefined;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  units?: {
    value: string;
    options: readonly string[];
    onChange: (u: string) => void;
  };
  placeholder?: string;
  onChange: (value: number | undefined) => void;
  aside?: ReactNode;
  responsive?: boolean;
  isInherited?: boolean;
}) {
  const id = useId();
  const [draft, setDraft] = useState(value === undefined ? '' : String(value));

  useEffect(() => setDraft(value === undefined ? '' : String(value)), [value]);

  const commit = (raw: string) => {
    if (raw.trim() === '') return onChange(undefined);
    const n = Number(raw);
    if (Number.isFinite(n)) onChange(Math.min(max, Math.max(min, n)));
  };

  return (
    <div>
      <ControlLabel label={label} htmlFor={id} responsive={responsive}>
        <div className="flex items-center gap-1.5">
          {units && (
            <select
              value={units.value}
              onChange={e => units.onChange(e.target.value)}
              className="h-5 rounded border border-steel-200 bg-white px-1 text-[10px] font-medium text-steel-700"
            >
              {units.options.map(u => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          )}
          {aside}
        </div>
      </ControlLabel>

      <div className={cn('flex items-center gap-2', isInherited && 'opacity-65')}>
        <input
          type="range"
          aria-label={label}
          min={min}
          max={max}
          step={step}
          value={value ?? min}
          onChange={e => onChange(Number(e.target.value))}
          className={cn('h-1.5 w-3/4 cursor-pointer accent-indigo-600', value === undefined && 'opacity-40')}
        />

        <div className="flex h-8 w-1/4 min-w-16 items-center rounded-md border border-steel-200 bg-white pr-2 focus-within:border-indigo-400">
          <input
            id={id}
            inputMode="decimal"
            value={draft}
            placeholder={placeholder ?? '–'}
            onChange={e => setDraft(e.target.value)}
            onBlur={e => commit(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && commit(e.currentTarget.value)}
            className="h-full w-full min-w-0 rounded-md border-0 bg-transparent px-2 text-xs focus:ring-0"
          />
          {unit && <span className="text-[11px] text-steel-400">{unit}</span>}
        </div>
      </div>
    </div>
  );
}

/** Full-width select under label (gear-trader style). */
export function SelectInput<T extends string>({
  label,
  value,
  options,
  onChange,
  aside,
  responsive,
  isInherited,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  aside?: ReactNode;
  responsive?: boolean;
  isInherited?: boolean;
}) {
  const id = useId();

  return (
    <div className="space-y-1.5">
      <ControlLabel label={label} htmlFor={id} responsive={responsive}>
        {aside}
      </ControlLabel>
      <select
        id={id}
        value={value}
        onChange={e => onChange(e.target.value as T)}
        className={cn(
          'h-8 w-full rounded-md border border-steel-200 bg-white px-2 text-xs text-steel-800 focus:border-indigo-400 focus:outline-none',
          isInherited && 'opacity-65 text-steel-500'
        )}
      >
        {options.map(o => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

/** Responsive wrapper for Choose */
export function ResponsiveChoose<T extends string>({
  label,
  value,
  options,
  onChange,
  columns,
  valid,
}: {
  label?: string;
  value: MaybeResponsive<T> | undefined;
  options: ChooseOption<T>[];
  onChange: (value: MaybeResponsive<T> | undefined) => void;
  columns?: number;
  valid?: (x: unknown) => T | undefined;
}) {
  const [device] = useCanvasDevice();
  const validator = valid ?? ((x: unknown) => (options.some(o => o.value === x) ? (x as T) : undefined));

  const isObject = typeof value === 'object' && value !== null && !Array.isArray(value);
  const currentDeviceVal = isObject ? (value as Partial<Record<Device, T>>)[device] : (device === 'desktop' ? (value as T | undefined) : undefined);
  const resolvedVal = resolveResponsive(value, device, validator);
  const hasOverride = currentDeviceVal !== undefined;
  const isInherited = !hasOverride && resolvedVal !== undefined && device !== 'desktop';

  const resetOverride = () => {
    if (!isObject) {
      if (device === 'desktop') onChange(undefined);
      return;
    }

    const next = { ...(value as Record<Device, T>) };
    delete next[device];
    const remaining = Object.values(next).some(v => v !== undefined);
    onChange(remaining ? next : undefined);
  };

  const handleChange = (nextVal: T) => {
    const base = isObject ? { ...(value as Record<Device, T>) } : (value !== undefined ? { desktop: value as T } : {});
    onChange({ ...base, [device]: nextVal });
  };

  const aside = hasOverride ? (
    <button
      type="button"
      title={`Reset ${device} override`}
      onClick={resetOverride}
      className="inline-flex items-center gap-0.5 text-[11px] text-indigo-600 hover:text-indigo-800"
    >
      <RotateCcw className="size-2.5" /> Reset
    </button>
  ) : isInherited ? (
    <span className="text-[10px] text-steel-400 italic">Inherited</span>
  ) : null;

  return (
    <Choose
      label={label}
      value={resolvedVal}
      options={options}
      onChange={handleChange}
      columns={columns}
      responsive
      aside={aside}
      isInherited={isInherited}
    />
  );
}

/** Responsive wrapper for SelectInput */
export function ResponsiveSelect<T extends string>({
  label,
  value,
  options,
  onChange,
  valid,
}: {
  label: string;
  value: MaybeResponsive<T> | undefined;
  options: { value: T; label: string }[];
  onChange: (value: MaybeResponsive<T> | undefined) => void;
  valid?: (x: unknown) => T | undefined;
}) {
  const [device] = useCanvasDevice();
  const validator = valid ?? ((x: unknown) => (options.some(o => o.value === x) ? (x as T) : undefined));

  const isObject = typeof value === 'object' && value !== null && !Array.isArray(value);
  const currentDeviceVal = isObject ? (value as Partial<Record<Device, T>>)[device] : (device === 'desktop' ? (value as T | undefined) : undefined);
  const resolvedVal = resolveResponsive(value, device, validator) ?? options[0]?.value;
  const hasOverride = currentDeviceVal !== undefined;
  const isInherited = !hasOverride && resolvedVal !== undefined && device !== 'desktop';

  const resetOverride = () => {
    if (!isObject) {
      if (device === 'desktop') onChange(undefined);
      return;
    }

    const next = { ...(value as Record<Device, T>) };
    delete next[device];
    const remaining = Object.values(next).some(v => v !== undefined);
    onChange(remaining ? next : undefined);
  };

  const handleChange = (nextVal: T) => {
    const base = isObject ? { ...(value as Record<Device, T>) } : (value !== undefined ? { desktop: value as T } : {});
    onChange({ ...base, [device]: nextVal });
  };

  const aside = hasOverride ? (
    <button
      type="button"
      title={`Reset ${device} override`}
      onClick={resetOverride}
      className="inline-flex items-center gap-0.5 text-[11px] text-indigo-600 hover:text-indigo-800"
    >
      <RotateCcw className="size-2.5" /> Reset
    </button>
  ) : isInherited ? (
    <span className="text-[10px] text-steel-400 italic">Inherited</span>
  ) : null;

  return (
    <SelectInput
      label={label}
      value={resolvedVal}
      options={options}
      onChange={handleChange}
      responsive
      aside={aside}
      isInherited={isInherited}
    />
  );
}

/** Responsive wrapper for Slider */
export function ResponsiveSlider({
  label,
  value,
  min,
  max,
  step = 1,
  unit,
  units,
  placeholder,
  onChange,
}: {
  label: string;
  value: MaybeResponsive<number> | undefined;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  units?: {
    value: string;
    options: readonly string[];
    onChange: (u: string) => void;
  };
  placeholder?: string;
  onChange: (value: MaybeResponsive<number> | undefined) => void;
}) {
  const [device] = useCanvasDevice();
  const validator = (x: unknown) => (typeof x === 'number' && Number.isFinite(x) ? x : undefined);

  const isObject = typeof value === 'object' && value !== null && !Array.isArray(value);
  const currentDeviceVal = isObject ? (value as Partial<Record<Device, number>>)[device] : (device === 'desktop' ? (value as number | undefined) : undefined);
  const resolvedVal = resolveResponsive(value, device, validator);
  const hasOverride = currentDeviceVal !== undefined;
  const isInherited = !hasOverride && resolvedVal !== undefined && device !== 'desktop';

  const resetOverride = () => {
    if (!isObject) {
      if (device === 'desktop') onChange(undefined);
      return;
    }

    const next = { ...(value as Record<Device, number>) };
    delete next[device];
    const remaining = Object.values(next).some(v => v !== undefined);
    onChange(remaining ? next : undefined);
  };

  const handleChange = (nextVal: number | undefined) => {
    const base: Partial<Record<Device, number>> = isObject
      ? { ...(value as Record<Device, number>) }
      : value !== undefined
        ? { desktop: value as number }
        : {};

    if (nextVal === undefined) {
      delete base[device];
      const remaining = Object.values(base).some(v => v !== undefined);
      onChange(remaining ? base : undefined);
    } else {
      onChange({ ...base, [device]: nextVal });
    }
  };

  const aside = hasOverride ? (
    <button
      type="button"
      title={`Reset ${device} override`}
      onClick={resetOverride}
      className="inline-flex items-center gap-0.5 text-[11px] text-indigo-600 hover:text-indigo-800"
    >
      <RotateCcw className="size-2.5" /> Reset
    </button>
  ) : isInherited ? (
    <span className="text-[10px] text-steel-400 italic">Inherited</span>
  ) : null;

  return (
    <Slider
      label={label}
      value={resolvedVal}
      min={min}
      max={max}
      step={step}
      unit={unit}
      units={units}
      placeholder={placeholder}
      onChange={handleChange}
      responsive
      aside={aside}
      isInherited={isInherited}
    />
  );
}

// Keep ColorInput for backwards compatibility if referenced elsewhere
const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

export function ColorInput({
  label,
  value,
  onChange,
  placeholder = 'Inherit',
}: {
  label: string;
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  placeholder?: string;
}) {
  const id = useId();
  const [draft, setDraft] = useState(value ?? '');

  useEffect(() => setDraft(value ?? ''), [value]);

  const commit = (raw: string) => {
    const next = raw.trim() ? (raw.trim().startsWith('#') ? raw.trim() : `#${raw.trim()}`) : '';
    if (!next) return onChange(undefined);
    if (HEX.test(next)) onChange(next.toLowerCase());
    else setDraft(value ?? '');
  };

  return (
    <div>
      <ControlLabel label={label} htmlFor={id} />
      <div className="flex h-9 items-center gap-2 rounded-md border border-steel-200 bg-steel-50 px-1.5 focus-within:border-indigo-400">
        <span className="relative size-6 shrink-0 overflow-hidden rounded border border-steel-200">
          <span
            className={cn('absolute inset-0', !value && 'bg-[repeating-conic-gradient(#e2e8f0_0_25%,#fff_0_50%)] bg-[length:8px_8px]')}
            style={value ? { background: value } : undefined}
          />
          <input
            type="color"
            aria-label={`${label} picker`}
            value={value && value.length === 7 ? value : '#000000'}
            onChange={e => onChange(e.target.value)}
            className="absolute inset-0 cursor-pointer opacity-0"
          />
        </span>
        <input
          id={id}
          value={draft}
          placeholder={placeholder}
          onChange={e => setDraft(e.target.value)}
          onBlur={e => commit(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && commit(e.currentTarget.value)}
          className="h-full min-w-0 flex-1 border-0 bg-transparent px-0 font-mono text-xs focus:ring-0"
        />
        {value && (
          <button type="button" aria-label={`Clear ${label}`} onClick={() => onChange(undefined)} className="text-steel-400 hover:text-steel-700">
            <X className="size-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
