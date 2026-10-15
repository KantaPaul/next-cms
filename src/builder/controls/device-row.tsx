'use client';

import { createUsePuck } from '@measured/puck';
import { Monitor, Smartphone, Tablet } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { DEVICE_WIDTH, deviceForWidth, type Device } from '../style';

const usePuck = createUsePuck();

const ICONS = { desktop: Monitor, tablet: Tablet, mobile: Smartphone };
const LABELS: Record<Device, string> = { desktop: 'Desktop', tablet: 'Tablet', mobile: 'Mobile' };

/** The device the canvas is showing. Changing it resizes the Puck viewport, so every device row stays in sync. */
export function useCanvasDevice() {
  const width = usePuck(s => s.appState.ui.viewports.current.width);
  const dispatch = usePuck(s => s.dispatch);
  const device = deviceForWidth(width);

  const setDevice = (next: Device) =>
    dispatch({
      type: 'setUi',
      ui: ui => ({ viewports: { ...ui.viewports, current: { width: DEVICE_WIDTH[next], height: 'auto' } } }),
    });

  return [device, setDevice] as const;
}

/** Monitor, tablet, and phone buttons that switch the canvas viewport. */
export function DeviceRow({ className }: { className?: string }) {
  const [device, setDevice] = useCanvasDevice();
  return (
    <div className={cn('flex items-center gap-0.5', className)} role="group" aria-label="Edit for device">
      {(Object.keys(ICONS) as Device[]).map(d => {
        const Icon = ICONS[d];
        return (
          <button
            key={d}
            type="button"
            title={LABELS[d]}
            aria-label={LABELS[d]}
            aria-pressed={device === d}
            onClick={() => setDevice(d)}
            className={cn(
              'rounded p-1 text-steel-400 transition-colors hover:text-indigo-600',
              device === d && 'bg-indigo-50 text-indigo-600'
            )}
          >
            <Icon className="size-3.5" />
          </button>
        );
      })}
    </div>
  );
}

/** Per-device toggles, for settings such as "play animation on" that are not tied to the current canvas width. */
export function DeviceToggles({
  value,
  onChange,
}: {
  value: Record<Device, boolean>;
  onChange: (value: Record<Device, boolean>) => void;
}) {
  return (
    <div className="flex gap-1" role="group" aria-label="Devices">
      {(Object.keys(ICONS) as Device[]).map(d => {
        const Icon = ICONS[d];
        return (
          <button
            key={d}
            type="button"
            aria-pressed={value[d]}
            title={`${value[d] ? 'Plays' : 'Static'} on ${LABELS[d].toLowerCase()}`}
            onClick={() => onChange({ ...value, [d]: !value[d] })}
            className={cn(
              'flex flex-1 items-center justify-center gap-1.5 rounded-md border px-2 py-1.5 text-xs transition-colors',
              value[d]
                ? 'border-indigo-200 bg-indigo-50 text-indigo-700'
                : 'border-steel-200 bg-white text-steel-400 line-through'
            )}
          >
            <Icon className="size-3.5" /> {LABELS[d]}
          </button>
        );
      })}
    </div>
  );
}
