'use client';

import { ChevronDown, RotateCcw, X } from 'lucide-react';
import { useEffect, useId, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';
import { resolveResponsive, type Device, type MaybeResponsive, type Responsive } from '../style';
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

/* ---------- Elementor-style extras ---------- */

export function Description({ children }: { children: ReactNode }) {
  return <p className="-mt-1 text-[11px] leading-snug text-steel-400">{children}</p>;
}

export function PanelHeading({ children }: { children: ReactNode }) {
  return <p className="pt-1 text-[11px] font-semibold tracking-wide text-steel-500 uppercase">{children}</p>;
}

export function Divider() {
  return <hr className="border-steel-100" />;
}

export function Notice({ children }: { children: ReactNode }) {
  return <div className="rounded-md border border-indigo-100 bg-indigo-50 px-2.5 py-2 text-[11px] text-indigo-800">{children}</div>;
}

/** Renders children only when the condition holds. Conditions live in code, never in page JSON. */
export function ShowWhen({ when, children }: { when: boolean; children: ReactNode }) {
  return when ? <>{children}</> : null;
}

export function Switcher({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean | undefined;
  onChange: (value: boolean) => void;
}) {
  const id = useId();

  return (
    <div className="flex items-center justify-between gap-2">
      <label htmlFor={id} className="text-xs font-medium text-steel-600">
        {label}
      </label>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={!!value}
        onClick={() => onChange(!value)}
        className={cn('relative h-5 w-9 rounded-full transition-colors', value ? 'bg-indigo-600' : 'bg-steel-200')}
      >
        <span className={cn('absolute top-0.5 left-0.5 size-4 rounded-full bg-white shadow transition-transform', value && 'translate-x-4')} />
      </button>
    </div>
  );
}

export type SelectGroup<T extends string> = { label: string; options: { value: T; label: string }[] };

/** Select with `<optgroup>`s, e.g. grouped animation catalogs. */
export function GroupedSelect<T extends string>({
  label,
  value,
  groups,
  onChange,
}: {
  label: string;
  value: T;
  groups: SelectGroup<T>[];
  onChange: (value: T) => void;
}) {
  const id = useId();

  return (
    <div className="space-y-1.5">
      <ControlLabel label={label} htmlFor={id} />
      <select
        id={id}
        value={value}
        onChange={e => onChange(e.target.value as T)}
        className="h-8 w-full rounded-md border border-steel-200 bg-white px-2 text-xs text-steel-800 focus:border-indigo-400 focus:outline-none"
      >
        {groups.map(g => (
          <optgroup key={g.label} label={g.label}>
            {g.options.map(o => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </div>
  );
}

/** Choose cells that show a thumbnail instead of text. */
export function VisualChoose<T extends string>({
  label,
  value,
  options,
  onChange,
  columns = 3,
}: {
  label: string;
  value: T | undefined;
  options: { value: T; label: string; thumb: ReactNode }[];
  onChange: (value: T) => void;
  columns?: number;
}) {
  return (
    <div>
      <ControlLabel label={label} />
      <div role="radiogroup" aria-label={label} className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
        {options.map(o => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={o.value === value}
            title={o.label}
            onClick={() => onChange(o.value)}
            className={cn(
              'flex flex-col items-center gap-1 rounded-md border p-1.5 text-[10px] text-steel-600',
              o.value === value ? 'border-indigo-400 bg-indigo-50' : 'border-steel-200 hover:bg-steel-50'
            )}
          >
            {o.thumb}
            <span className="truncate">{o.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/** Normal / Hover tab pair; the hover pane is for optional overrides. */
export function StateTabs({ normal, hover }: { normal: ReactNode; hover: ReactNode }) {
  const [state, setState] = useState<'normal' | 'hover'>('normal');

  return (
    <div className="space-y-3">
      <div role="tablist" className="grid grid-cols-2 divide-x divide-steel-200 overflow-hidden rounded-sm border border-steel-200 text-xs">
        {(['normal', 'hover'] as const).map(t => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={state === t}
            onClick={() => setState(t)}
            className={cn('py-1.5 capitalize', state === t ? 'bg-steel-100 font-medium text-steel-900' : 'text-steel-600 hover:bg-steel-50')}
          >
            {t}
          </button>
        ))}
      </div>
      {state === 'normal' ? normal : hover}
    </div>
  );
}

/** Responsive slider whose unit select is stored beside the values, each unit clamped to its own range. */
export function UnitSlider<U extends string>({
  label,
  value,
  unit,
  units,
  limits,
  onChange,
}: {
  label: string;
  value: Responsive<number> | undefined;
  unit: U | undefined;
  units: readonly U[];
  limits: Record<U, { min: number; max: number; step: number }>;
  onChange: (value: Responsive<number> | undefined, unit: U) => void;
}) {
  const current = unit && units.includes(unit) ? unit : units[0];
  const lim = limits[current];

  return (
    <ResponsiveSlider
      label={label}
      value={value}
      min={lim.min}
      max={lim.max}
      step={lim.step}
      unit={current}
      units={{ value: current, options: units, onChange: u => onChange(clampAll(value, limits[u as U]), u as U) }}
      onChange={v => onChange(v as Responsive<number> | undefined, current)}
    />
  );
}

function clampAll(value: Responsive<number> | undefined, lim: { min: number; max: number }) {
  if (value === undefined) return undefined;
  const fit = (n: number) => Math.min(lim.max, Math.max(lim.min, n));
  return Object.fromEntries(Object.entries(value).map(([d, n]) => [d, fit(n as number)])) as Responsive<number>;
}
