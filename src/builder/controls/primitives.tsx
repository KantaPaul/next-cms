'use client';

import { ChevronDown, RotateCcw, X } from 'lucide-react';
import { useEffect, useId, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { FormInput } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
      <Label htmlFor={htmlFor} className="text-xs font-medium text-steel-600">
        {label}
      </Label>
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
    <Collapsible open={open} onOpenChange={setOpen} className="border-t border-steel-100 first:border-t-0">
      <CollapsibleTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          aria-controls={id}
          className="flex h-auto w-full items-center justify-between rounded-none px-0 py-2.5 text-left text-sm font-medium text-steel-800 hover:bg-transparent"
        >
          {title}
          <ChevronDown className={cn('size-4 text-steel-400 transition-transform', open && 'rotate-180')} />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent id={id} className="space-y-4 pb-4">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}

export type ChooseOption<T extends string> = { value: T; label: string; icon?: ReactNode };

/** Segmented button row for mutually exclusive options. */
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
          'grid divide-x divide-border overflow-hidden rounded-md border border-border bg-background text-xs',
          !columns && 'auto-cols-fr grid-flow-col',
          isInherited && 'opacity-65'
        )}
        style={columns ? { gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` } : undefined}
      >
        {options.map(option => {
          const selected = option.value === value;

          return (
            <Button
              key={option.value}
              type="button"
              role="radio"
              variant="ghost"
              aria-checked={selected}
              title={option.label}
              aria-label={option.icon ? option.label : undefined}
              onClick={() => onChange(option.value)}
              className={cn(
                'h-8 min-h-8 rounded-none px-1.5 py-1.5 text-xs [&>svg]:size-4',
                selected
                  ? 'bg-muted font-medium text-foreground hover:bg-muted'
                  : 'text-muted-foreground hover:bg-muted/50'
              )}
            >
              {option.icon ?? <span className="truncate">{option.label}</span>}
            </Button>
          );
        })}
      </div>
    </div>
  );
}

/** Range plus an editable number with optional unit select. */
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
            <Select value={units.value} onValueChange={units.onChange}>
              <SelectTrigger size="sm" className="h-5 w-auto min-w-12 gap-0.5 border-steel-200 px-1 text-[10px] font-medium">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {units.options.map(u => (
                  <SelectItem key={u} value={u} className="text-xs">
                    {u}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
          className={cn('h-1.5 w-3/4 cursor-pointer accent-primary', value === undefined && 'opacity-40')}
        />

        <div className="flex h-8 w-1/4 min-w-16 items-center rounded-md border border-input bg-background pr-2 focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px]">
          <FormInput
            id={id}
            inputMode="decimal"
            value={draft}
            placeholder={placeholder ?? '–'}
            onChange={e => setDraft(e.target.value)}
            onBlur={e => commit(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && commit(e.currentTarget.value)}
            className="h-full border-0 bg-transparent px-2 text-xs shadow-none focus-visible:ring-0"
          />
          {unit && <span className="text-[11px] text-muted-foreground">{unit}</span>}
        </div>
      </div>
    </div>
  );
}

/** Full-width select under label. */
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
      <Select value={value} onValueChange={v => onChange(v as T)}>
        <SelectTrigger
          id={id}
          size="sm"
          className={cn('h-8 w-full text-xs', isInherited && 'opacity-65 text-muted-foreground')}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map(o => (
            <SelectItem key={o.value} value={o.value} className="text-xs">
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
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
  const currentDeviceVal = isObject
    ? (value as Partial<Record<Device, T>>)[device]
    : device === 'desktop'
      ? (value as T | undefined)
      : undefined;
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
    const base = isObject
      ? { ...(value as Record<Device, T>) }
      : value !== undefined
        ? { desktop: value as T }
        : {};
    onChange({ ...base, [device]: nextVal });
  };

  const aside = hasOverride ? (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      title={`Reset ${device} override`}
      onClick={resetOverride}
      className="h-auto gap-0.5 px-1 py-0 text-[11px] text-primary hover:text-primary"
    >
      <RotateCcw className="size-2.5" /> Reset
    </Button>
  ) : isInherited ? (
    <span className="text-[10px] text-muted-foreground italic">Inherited</span>
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
  const currentDeviceVal = isObject
    ? (value as Partial<Record<Device, T>>)[device]
    : device === 'desktop'
      ? (value as T | undefined)
      : undefined;
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
    const base = isObject
      ? { ...(value as Record<Device, T>) }
      : value !== undefined
        ? { desktop: value as T }
        : {};
    onChange({ ...base, [device]: nextVal });
  };

  const aside = hasOverride ? (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      title={`Reset ${device} override`}
      onClick={resetOverride}
      className="h-auto gap-0.5 px-1 py-0 text-[11px] text-primary hover:text-primary"
    >
      <RotateCcw className="size-2.5" /> Reset
    </Button>
  ) : isInherited ? (
    <span className="text-[10px] text-muted-foreground italic">Inherited</span>
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
  const currentDeviceVal = isObject
    ? (value as Partial<Record<Device, number>>)[device]
    : device === 'desktop'
      ? (value as number | undefined)
      : undefined;
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
    <Button
      type="button"
      variant="ghost"
      size="sm"
      title={`Reset ${device} override`}
      onClick={resetOverride}
      className="h-auto gap-0.5 px-1 py-0 text-[11px] text-primary hover:text-primary"
    >
      <RotateCcw className="size-2.5" /> Reset
    </Button>
  ) : isInherited ? (
    <span className="text-[10px] text-muted-foreground italic">Inherited</span>
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
      <div className="flex h-9 items-center gap-2 rounded-md border border-input bg-muted/40 px-1.5 focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px]">
        <span className="relative size-6 shrink-0 overflow-hidden rounded border border-border">
          <span
            className={cn(
              'absolute inset-0',
              !value && 'bg-[repeating-conic-gradient(#e2e8f0_0_25%,#fff_0_50%)] bg-[length:8px_8px]'
            )}
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
        <FormInput
          id={id}
          value={draft}
          placeholder={placeholder}
          onChange={e => setDraft(e.target.value)}
          onBlur={e => commit(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && commit(e.currentTarget.value)}
          className="h-full min-w-0 flex-1 border-0 bg-transparent px-0 font-mono text-xs shadow-none focus-visible:ring-0"
        />
        {value && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={`Clear ${label}`}
            onClick={() => onChange(undefined)}
            className="size-6 text-muted-foreground"
          >
            <X className="size-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}

export function Description({ children }: { children: ReactNode }) {
  return <p className="-mt-1 text-[11px] leading-snug text-muted-foreground">{children}</p>;
}

export function PanelHeading({ children }: { children: ReactNode }) {
  return (
    <p className="pt-1 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">{children}</p>
  );
}

export function Divider() {
  return <Separator className="bg-border" />;
}

export function Notice({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-md border border-primary/20 bg-primary/5 px-2.5 py-2 text-[11px] text-primary">
      {children}
    </div>
  );
}

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
      <Label htmlFor={id} className="text-xs font-medium text-steel-600">
        {label}
      </Label>
      <Switch id={id} checked={!!value} onChange={checked => onChange(!!checked)} />
    </div>
  );
}

/** Select with grouped options, e.g. animation catalogs. */
export function GroupedSelect<T extends string>({
  label,
  value,
  groups,
  onChange,
}: {
  label: string;
  value: T;
  groups: { label: string; options: { value: T; label: string }[] }[];
  onChange: (value: T) => void;
}) {
  const id = useId();

  return (
    <div className="space-y-1.5">
      <ControlLabel label={label} htmlFor={id} />
      <Select value={value} onValueChange={v => onChange(v as T)}>
        <SelectTrigger id={id} size="sm" className="h-8 w-full text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {groups.map(g => (
            <SelectGroup key={g.label}>
              <SelectLabel className="text-[10px] text-muted-foreground">{g.label}</SelectLabel>
              {g.options.map(o => (
                <SelectItem key={o.value} value={o.value} className="text-xs">
                  {o.label}
                </SelectItem>
              ))}
            </SelectGroup>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export type VisualOption<T extends string> = { value: T; label: string; thumb: ReactNode };

/** Grid of visual choices (thumbnails). */
export function VisualChoose<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label?: string;
  value: T;
  options: VisualOption<T>[];
  onChange: (value: T) => void;
}) {
  return (
    <div>
      {label && <ControlLabel label={label} />}
      <div className="grid grid-cols-3 gap-1.5">
        {options.map(o => (
          <Button
            key={o.value}
            type="button"
            variant="outline"
            onClick={() => onChange(o.value)}
            className={cn(
              'h-auto flex-col gap-1 rounded-md p-1.5 text-[10px]',
              o.value === value
                ? 'border-primary bg-primary/5 text-foreground'
                : 'text-muted-foreground'
            )}
          >
            {o.thumb}
            <span className="truncate">{o.label}</span>
          </Button>
        ))}
      </div>
    </div>
  );
}

/** Normal / Hover tab pair; the hover pane is for optional overrides. */
export function StateTabs({ normal, hover }: { normal: ReactNode; hover: ReactNode }) {
  return (
    <Tabs defaultValue="normal" className="space-y-3">
      <TabsList className="grid h-8 w-full grid-cols-2 rounded-md p-0">
        <TabsTrigger value="normal" className="h-full rounded-none text-xs capitalize data-[state=active]:bg-muted">
          Normal
        </TabsTrigger>
        <TabsTrigger value="hover" className="h-full rounded-none text-xs capitalize data-[state=active]:bg-muted">
          Hover
        </TabsTrigger>
      </TabsList>
      <TabsContent value="normal" className="mt-0 space-y-3">
        {normal}
      </TabsContent>
      <TabsContent value="hover" className="mt-0 space-y-3">
        {hover}
      </TabsContent>
    </Tabs>
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
