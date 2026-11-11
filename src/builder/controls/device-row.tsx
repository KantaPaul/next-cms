'use client';

import {
  DEFAULT_BREAKPOINTS,
  DEVICE_LABELS,
  enabledDevices,
} from '@nextcms/builder-core';
import {
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

/** The device the canvas is showing. Changing it resizes the canvas in whichever editor hosts the control. */
export function useCanvasDevice() {
  const { device, setDevice } = useEditorBridge();
  return [device, setDevice] as const;
}

/** Enabled device buttons that switch the canvas viewport. */
export function DeviceRow({ className }: { className?: string }) {
  const { device, setDevice, breakpoints } = useEditorBridge();
  const bp = breakpoints ?? DEFAULT_BREAKPOINTS;
  const active = enabledDevices(bp);
  const byDevice = new Map(bp.map(entry => [entry.device, entry]));
  return (
    <fieldset
      className={cn(
        'flex min-w-0 flex-wrap items-center gap-0.5 border-0 p-0',
        className
      )}
      aria-label="Edit for device"
    >
      {active.map(d => {
        const Icon = ICONS[d] ?? Monitor;
        const label = byDevice.get(d)?.label ?? DEVICE_LABELS[d];
        return (
          <Button
            key={d}
            type="button"
            variant="ghost"
            size="icon-sm"
            title={label}
            aria-label={label}
            aria-pressed={device === d}
            onClick={() => setDevice(d)}
            className={cn(
              'size-6 text-muted-foreground hover:text-primary',
              device === d &&
                'bg-primary/10 text-primary hover:bg-primary/10 hover:text-primary'
            )}
          >
            <Icon className="size-3.5" />
          </Button>
        );
      })}
    </fieldset>
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
