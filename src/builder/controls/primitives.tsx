'use client';

import { ChevronDown, X } from 'lucide-react';
import { useEffect, useId, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

export function ControlLabel({ label, htmlFor, children }: { label: string; htmlFor?: string; children?: ReactNode }) {
  return (
    <div className="mb-1.5 flex min-h-5 items-center justify-between gap-2">
      <label htmlFor={htmlFor} className="text-xs font-medium text-steel-600">
        {label}
      </label>
      {children}
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

/** Segmented button row: icon or short label, tooltip, filled when selected. */
export function Choose<T extends string>({
  label,
  value,
  options,
  onChange,
  columns,
  aside,
}: {
  label?: string;
  value: T | undefined;
  options: ChooseOption<T>[];
  onChange: (value: T) => void;
  columns?: number;
  aside?: ReactNode;
}) {
  return (
    <div>
      {label && <ControlLabel label={label}>{aside}</ControlLabel>}
      <div
        role="radiogroup"
        aria-label={label}
        className={cn(
          'grid overflow-hidden rounded-md border border-steel-200 bg-white text-xs',
          !columns && 'auto-cols-fr grid-flow-col'
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
                'flex min-h-8 items-center justify-center gap-1 border-b border-r border-steel-100 px-1.5 py-1.5 transition-colors [&>svg]:size-4',
                selected ? 'bg-steel-800 text-white' : 'text-steel-600 hover:bg-steel-50'
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

/** Range plus an editable number. */
export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  unit,
  placeholder,
  onChange,
  aside,
}: {
  label: string;
  value: number | undefined;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  placeholder?: string;
  onChange: (value: number | undefined) => void;
  aside?: ReactNode;
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
      <ControlLabel label={label} htmlFor={id}>
        {aside}
      </ControlLabel>
      <div className="flex items-center gap-2">
        <input
          type="range"
          aria-label={label}
          min={min}
          max={max}
          step={step}
          value={value ?? min}
          onChange={e => onChange(Number(e.target.value))}
          className={cn('h-1.5 flex-1 cursor-pointer accent-indigo-600', value === undefined && 'opacity-40')}
        />
        <div className="flex h-8 w-20 items-center rounded-md border border-steel-200 bg-white pr-2 focus-within:border-indigo-400">
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

const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

/** Color swatch plus a hex input. Empty means "inherit". */
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

export function SelectInput<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  const id = useId();
  return (
    <div className="flex items-center justify-between gap-3">
      <label htmlFor={id} className="text-xs font-medium text-steel-600">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={e => onChange(e.target.value as T)}
        className="h-8 w-1/2 rounded-md border border-steel-200 bg-white py-0 pl-2 text-xs"
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
