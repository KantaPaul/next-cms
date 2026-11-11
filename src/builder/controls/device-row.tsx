'use client';

import {
  type BreakpointConfig,
  DEFAULT_BREAKPOINTS,
  DEVICE_LABELS,
  enabledDevices,
} from '@nextcms/builder-core';
import { Popover } from '@nextcms/editor-ui';
import {
  Check,
  ChevronDown,
  Laptop,
  Monitor,
  Smartphone,
  Tablet,
  TabletSmartphone,
  Tv,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils/cn';
import type { Device } from '../style';
import { useEditorBridge } from './editor-bridge';

const ICONS: Record<Device, typeof Monitor> = {
  widescreen: Tv,
  desktop: Monitor,
  laptop: Laptop,
  tablet_extra: TabletSmartphone,
  tablet: Tablet,
  mobile_extra: TabletSmartphone,
  mobile: Smartphone,
};

export type DeviceListItem = {
  device: Device;
  label: string;
  hint: string;
};

/** Enabled breakpoints in canonical top-to-bottom order with size hints. */
export function getDeviceListItems(
  breakpoints: BreakpointConfig = DEFAULT_BREAKPOINTS
): DeviceListItem[] {
  const active = enabledDevices(breakpoints);
  const byDevice = new Map(breakpoints.map(entry => [entry.device, entry]));
  return active.map(d => {
    const entry = byDevice.get(d);
    const label = entry?.label ?? DEVICE_LABELS[d];
    const hint =
      d === 'desktop'
        ? 'Default'
        : d === 'widescreen'
          ? `≥ ${entry?.width ?? 2400}px`
          : `≤ ${entry?.width ?? 0}px`;
    return { device: d, label, hint };
  });
}

/** The device the canvas is showing. Changing it resizes the canvas in whichever editor hosts the control. */
export function useCanvasDevice() {
  const { device, setDevice } = useEditorBridge();
  return [device, setDevice] as const;
}

/**
 * Elementor-style responsive breakpoint selector: shows the active device icon,
 * and clicking it opens a vertical list of all enabled devices top to bottom.
 */
export function DeviceRow({ className }: { className?: string }) {
  const { device, setDevice, breakpoints } = useEditorBridge();
  const bp = breakpoints ?? DEFAULT_BREAKPOINTS;
  const items = getDeviceListItems(bp);
  const activeItem = items.find(i => i.device === device) ?? items[0];
  const ActiveIcon = ICONS[device] ?? Monitor;

  return (
    <Popover
      align="end"
      className="w-48 min-w-[12rem] p-1"
      trigger={
        <Button
          type="button"
          variant="ghost"
          size="sm"
          title={`${activeItem?.label ?? DEVICE_LABELS[device]} (${activeItem?.hint ?? ''}) — switch device`}
          aria-label={`Edit for device: ${activeItem?.label ?? DEVICE_LABELS[device]}`}
          className={cn(
            'h-6 gap-0.5 px-1 text-primary hover:bg-primary/10 hover:text-primary',
            className
          )}
        >
          <ActiveIcon className="size-3.5" />
          <ChevronDown className="size-2.5 opacity-70" />
        </Button>
      }
      content={close => (
        <div
          role="listbox"
          aria-label="Edit for device"
          className="flex flex-col gap-0.5"
        >
          {items.map(item => {
            const Icon = ICONS[item.device] ?? Monitor;
            const selected = item.device === device;
            return (
              <button
                key={item.device}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => {
                  setDevice(item.device);
                  close();
                }}
                className={cn(
                  'flex w-full items-center justify-between gap-2 rounded-[var(--ne-radius-sm)] px-2 py-1.5 text-left text-xs transition-colors',
                  selected
                    ? 'bg-[var(--ne-primary-soft)] font-medium text-[var(--ne-primary)]'
                    : 'text-[var(--ne-text)] hover:bg-[var(--ne-surface-hover)]'
                )}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <Icon className="size-3.5 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </span>
                <span className="flex shrink-0 items-center gap-1 text-[10px] text-[var(--ne-text-muted)]">
                  <span>{item.hint}</span>
                  {selected && <Check className="size-3 text-[var(--ne-primary)]" />}
                </span>
              </button>
            );
          })}
        </div>
      )}
    />
  );
}

/** Per-device toggles, for settings such as "play animation on" that are not tied to the current canvas width. */
export function DeviceToggles({
  value,
  onChange,
}: {
  value: Partial<Record<Device, boolean>>;
  onChange: (value: Partial<Record<Device, boolean>>) => void;
}) {
  const { breakpoints } = useEditorBridge();
  const bp = breakpoints ?? DEFAULT_BREAKPOINTS;
  const active = enabledDevices(bp);
  const byDevice = new Map(bp.map(entry => [entry.device, entry]));
  return (
    <fieldset
      className="flex min-w-0 flex-wrap gap-1 border-0 p-0"
      aria-label="Devices"
    >
      {active.map(d => {
        const Icon = ICONS[d] ?? Monitor;
        const label = byDevice.get(d)?.label ?? DEVICE_LABELS[d];
        const on = value[d] !== false;
        return (
          <Button
            key={d}
            type="button"
            variant="outline"
            size="sm"
            aria-pressed={on}
            title={`${on ? 'Active' : 'Hidden'} on ${label.toLowerCase()}`}
            onClick={() => onChange({ ...value, [d]: !on })}
            className={cn(
              'h-8 min-w-[4.5rem] flex-1 gap-1.5 px-2 text-xs',
              on
                ? 'border-primary/30 bg-primary/5 text-primary hover:bg-primary/10'
                : 'text-muted-foreground line-through'
            )}
          >
            <Icon className="size-3.5 shrink-0" />
            <span className="truncate">{label}</span>
          </Button>
        );
      })}
    </fieldset>
  );
}
